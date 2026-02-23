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
//   1. userId taken from verified JWT (requireAuth), not from the request body.
//   2. escapeHtml() on all user-supplied fields before HTML interpolation → XSS fix.
//   3. Rate limited: 3 enquiries per 10 minutes per authenticated user.
//   4. Internal errors no longer leaked to client.
//   5. Input validation (type allowlist, length limits).

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const ALLOWED_TYPES = new Set(["enquiry", "suggestion"]);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Authenticate — userId from verified JWT, not request body
    const { user } = await requireAuth(req);

    // 2. Rate limit: 3 per 10 minutes per user
    if (!checkRateLimit(`send-enquiry-email:${user.id}`, 3, 10 * 60 * 1000)) {
      return rateLimitedResponse(req);
    }

    const body = await req.json();
    const type: string = body?.type ?? "";
    const subject: string = body?.subject ?? "";
    const message: string = body?.message ?? "";
    const contactEmail: string = body?.contactEmail ?? "";
    const contactPhone: string = body?.contactPhone ?? "";

    // 3. Validate
    if (!ALLOWED_TYPES.has(type)) {
      return new Response(JSON.stringify({ error: "Invalid enquiry type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (!subject.trim() || subject.length > 200) {
      return new Response(JSON.stringify({ error: "Subject required (max 200 chars)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (!message.trim() || message.length > 5000) {
      return new Response(JSON.stringify({ error: "Message required (max 5000 chars)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 4. Persist — user.id from JWT, not from client body
    const { error: dbError } = await supabaseAdmin.from("enquiries").insert({
      user_id: user.id,
      type,
      subject: subject.trim(),
      message: message.trim(),
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      status: "submitted",
    });

    if (dbError) {
      console.error("Enquiry DB error:", dbError.message);
      return new Response(JSON.stringify({ error: "Failed to save enquiry." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 5. Send email (optional, degrades gracefully)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey && !resendApiKey.includes("placeholder")) {
      // 6. Escape ALL user-supplied content before HTML interpolation → XSS prevention
      const safeType = escapeHtml(type);
      const safeSubject = escapeHtml(subject.trim());
      const safeMessage = escapeHtml(message.trim());
      const safeUserEmail = escapeHtml(user.email ?? "");
      const safeContactEmail = escapeHtml(contactEmail.trim());
      const safeContactPhone = escapeHtml(contactPhone.trim());
      const safeUserId = escapeHtml(user.id);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">
              ${safeType === "enquiry" ? "&#x2753; New Enquiry" : "&#x1F4A1; New Suggestion"}
            </h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 6px;">
              <h2 style="color: #333; margin-top: 0;">${safeSubject}</h2>
              <div style="margin: 20px 0; padding: 15px; background: #f1f3f4; border-left: 4px solid #667eea; border-radius: 4px;">
                <p style="margin: 0; white-space: pre-line; line-height: 1.6;">${safeMessage}</p>
              </div>
              <div style="border-top: 1px solid #e1e5e9; padding-top: 15px; margin-top: 20px;">
                <h3 style="color: #666; font-size: 16px; margin-bottom: 10px;">Contact Information:</h3>
                <p style="margin: 5px 0;"><strong>User Email:</strong> ${safeUserEmail}</p>
                ${safeContactEmail ? `<p style="margin: 5px 0;"><strong>Preferred Email:</strong> ${safeContactEmail}</p>` : ""}
                ${safeContactPhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${safeContactPhone}</p>` : ""}
                <p style="margin: 5px 0;"><strong>User ID:</strong> ${safeUserId}</p>
                <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toUTCString()}</p>
              </div>
            </div>
          </div>
        </div>`;

      try {
        await resend.emails.send({
          from: "Tralo Enquiries <onboarding@resend.dev>",
          to: ["enquiries.traloapp@gmail.com"],
          subject: `Tralo ${type === "enquiry" ? "Enquiry" : "Suggestion"}: ${subject.trim().slice(0, 100)}`,
          html: emailHtml,
          replyTo: user.email ?? undefined,
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