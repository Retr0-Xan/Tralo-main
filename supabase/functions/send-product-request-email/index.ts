import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "https://esm.sh/resend@4.0.0";
import {
  getCorsHeaders,
  corsPreflightResponse,
  requireAuth,
  authErrorResponse,
  AuthError,
  checkRateLimit,
  rateLimitedResponse,
  escapeHtml,
  internalErrorResponse,
} from "../_shared/security.ts";

// Security fixes:
//   1. userId from JWT, not request body.
//   2. escapeHtml() on all user fields in email HTML → XSS prevention.
//   3. Rate limited: 5 requests per 10 minutes per user.
//   4. Internal errors suppressed from client response.
//   5. Priority validated against allowlist.

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

const PRIORITY_COLORS: Record<string, string> = { low: "#28a745", medium: "#ffc107", high: "#dc3545" };
const PRIORITY_LABELS: Record<string, string> = { low: "LOW", medium: "MEDIUM", high: "HIGH" };

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const corsHeaders = getCorsHeaders(req);

  try {
    const { user } = await requireAuth(req);

    if (!checkRateLimit(`send-product-request:${user.id}`, 5, 10 * 60 * 1000)) {
      return rateLimitedResponse(req);
    }

    const body = await req.json();
    const productName: string = body?.productName ?? "";
    const description: string = body?.description ?? "";
    const reason: string = body?.reason ?? "";
    const priority: string = body?.priority ?? "";

    if (!productName.trim() || productName.length > 200) {
      return new Response(JSON.stringify({ error: "Product name required (max 200 chars)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (!ALLOWED_PRIORITIES.has(priority)) {
      return new Response(JSON.stringify({ error: "Priority must be low, medium, or high" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (description.length > 2000 || reason.length > 2000) {
      return new Response(JSON.stringify({ error: "Description/reason must be under 2000 chars" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Persist with verified user.id
    const { error: dbError } = await supabaseAdmin.from("product_requests").insert({
      user_id: user.id,
      product_name: productName.trim(),
      description: description.trim() || null,
      reason: reason.trim() || null,
      priority,
      status: "submitted",
    });

    if (dbError) {
      console.error("Product request DB error:", dbError.message);
      return new Response(JSON.stringify({ error: "Failed to save product request." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey && !resendApiKey.includes("placeholder")) {
      // Escape every user-supplied field before HTML interpolation
      const safeName = escapeHtml(productName.trim());
      const safeDesc = escapeHtml(description.trim());
      const safeReason = escapeHtml(reason.trim());
      const safePriority = escapeHtml(priority);
      const safeUserEmail = escapeHtml(user.email ?? "");
      const safeUserId = escapeHtml(user.id);
      const priorityColor = PRIORITY_COLORS[priority] ?? "#999";
      const priorityLabel = PRIORITY_LABELS[priority] ?? priority.toUpperCase();

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">&#x1F4E6; New Product Request</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <h2 style="color: #333; margin: 0; flex: 1;">${safeName}</h2>
                <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${priorityLabel} PRIORITY
                </span>
              </div>
              ${safeDesc ? `
              <div style="margin: 15px 0; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                <h3 style="margin: 0 0 8px 0; color: #1976d2; font-size: 14px;">Product Description:</h3>
                <p style="margin: 0; white-space: pre-line; line-height: 1.6;">${safeDesc}</p>
              </div>` : ""}
              ${safeReason ? `
              <div style="margin: 15px 0; padding: 15px; background: #f3e5f5; border-left: 4px solid #9c27b0; border-radius: 4px;">
                <h3 style="margin: 0 0 8px 0; color: #7b1fa2; font-size: 14px;">Reason for Request:</h3>
                <p style="margin: 0; white-space: pre-line; line-height: 1.6;">${safeReason}</p>
              </div>` : ""}
              <div style="border-top: 1px solid #e1e5e9; padding-top: 15px; margin-top: 20px;">
                <p style="margin: 5px 0;"><strong>Requested by:</strong> ${safeUserEmail}</p>
                <p style="margin: 5px 0;"><strong>User ID:</strong> ${safeUserId}</p>
                <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toUTCString()}</p>
              </div>
            </div>
          </div>
        </div>`;

      try {
        await resend.emails.send({
          from: "Tralo Products <onboarding@resend.dev>",
          to: ["enquiries.traloapp@gmail.com"],
          subject: `Tralo Product Request: ${productName.trim().slice(0, 80)} [${priorityLabel} PRIORITY]`,
          html: emailHtml,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Email send failed (non-fatal):", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, stored: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: unknown) {
    if (err instanceof AuthError) return authErrorResponse(err, req);
    return internalErrorResponse(err, req);
  }
});