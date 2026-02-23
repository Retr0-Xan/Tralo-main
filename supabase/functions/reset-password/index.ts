import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  getCorsHeaders,
  corsPreflightResponse,
  requireAuth,
  authErrorResponse,
  AuthError,
  checkRateLimit,
  rateLimitedResponse,
  getClientId,
  internalErrorResponse,
} from "../_shared/security.ts";

// Security fix summary (replaces the original implementation):
//
// BEFORE – Critical vulnerabilities:
//   1. No authentication: anyone could call this endpoint and reset any
//      account's password by supplying any email address.
//   2. listUsers() dumped ALL users to find one → user enumeration + data leak.
//   3. Raw error.message returned to client.
//   4. No rate limiting.
//
// AFTER:
//   1. requireAuth() validates the caller's JWT.  Only the *authenticated*
//      user can change their own password via supabase.auth.updateUser().
//      The service-role admin API is no longer used here.
//   2. listUsers() removed entirely.
//   3. Internal errors swallowed; generic message returned.
//   4. 5 requests / 15 min rate limit per IP.

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const corsHeaders = getCorsHeaders(req);

  // Rate limit: 5 password-reset attempts per 15 minutes per IP
  const clientId = getClientId(req);
  if (!checkRateLimit(`reset-password:${clientId}`, 5, 15 * 60 * 1000)) {
    return rateLimitedResponse(req);
  }

  try {
    // The user must already be authenticated (they arrived here via the
    // Supabase magic-link / recovery flow which sets a short-lived session).
    const { user, supabase } = await requireAuth(req);

    const body = await req.json();
    const newPassword: string = body?.newPassword ?? "";

    // Server-side validation
    if (!newPassword || typeof newPassword !== "string") {
      return new Response(
        JSON.stringify({ error: "newPassword is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (newPassword.length > 128) {
      return new Response(
        JSON.stringify({ error: "Password must be less than 128 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update the password for the *authenticated* user only – no admin bypass.
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      console.error("Password update error for user:", user.id, updateError.message);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please request a new reset link." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Password updated for user: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: unknown) {
    if (err instanceof AuthError) return authErrorResponse(err, req);
    return internalErrorResponse(err, req);
  }
};

serve(handler);