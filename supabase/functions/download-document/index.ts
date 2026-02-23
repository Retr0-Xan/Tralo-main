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
    safeFilename,
    internalErrorResponse,
} from "../_shared/security.ts";

// Security fixes applied:
//   1. Authentication required – only authenticated users can download.
//   2. Path traversal prevention – filePath is validated against an allowlist
//      of known prefixes and all ".." sequences are rejected.
//   3. Ownership check – the requested file path must start with the caller's
//      user ID (receipts/invoices are stored under user_id/ prefixes).
//      Public admin-generated documents can be exempted per the ALLOW_PUBLIC_PREFIXES list.
//   4. Content-Disposition filename sanitised.
//   5. Internal error details no longer leak to the client.
//   6. Rate limited to 30 downloads per minute per user.

/** Prefixes that are readable by any authenticated user (no ownership check). */
const ALLOW_PUBLIC_PREFIXES: string[] = [];

/** Only these top-level prefixes are valid storage paths. */
const VALID_PREFIXES = ["receipts/", "invoices/", "waybills/", "statements/", "sales-reports/", "proforma-invoices/"];

function isPathSafe(filePath: string, userId: string): boolean {
    // Reject any traversal attempt
    if (filePath.includes("..") || filePath.includes("//") || filePath.startsWith("/")) {
        return false;
    }

    // Must fall under a known prefix
    const hasValidPrefix = VALID_PREFIXES.some(p => filePath.startsWith(p));
    if (!hasValidPrefix) return false;

    // Allow explicitly public prefixes without an ownership check
    if (ALLOW_PUBLIC_PREFIXES.some(p => filePath.startsWith(p))) return true;

    // Otherwise the file path must contain the caller's userId so they can only
    // access their own documents.  Storage paths are:  <prefix>/<userId>_... or <prefix>/<userId>/...
    // Adjust the pattern if your naming convention differs.
    const afterPrefix = filePath.split("/").slice(1).join("/");
    return afterPrefix.startsWith(userId);
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return corsPreflightResponse(req);

    const corsHeaders = getCorsHeaders(req);

    try {
        // Require authentication
        const { user } = await requireAuth(req);

        // Rate limit: 30 downloads per minute per user
        if (!checkRateLimit(`download-document:${user.id}`, 30, 60 * 1000)) {
            return rateLimitedResponse(req);
        }

        const url = new URL(req.url);
        const filePath = url.searchParams.get("file");

        if (!filePath || typeof filePath !== "string") {
            return new Response(
                JSON.stringify({ error: "Missing file parameter" }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Validate path – prevents path traversal and cross-user access
        if (!isPathSafe(filePath, user.id)) {
            console.warn(`Blocked path traversal / unauthorized download attempt by ${user.id}: ${filePath}`);
            return new Response(
                JSON.stringify({ error: "File not found" }),
                { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const storageUrl = `${supabaseUrl}/storage/v1/object/public/documents/${filePath}`;
        const response = await fetch(storageUrl);

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: "File not found" }),
                { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const htmlContent = await response.text();

        // Sanitise the filename used in Content-Disposition
        const rawName = filePath.split("/").pop() ?? "document.html";
        const fileName = safeFilename(rawName);

        return new Response(htmlContent, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                ...corsHeaders,
            },
        });

    } catch (err: unknown) {
        if (err instanceof AuthError) return authErrorResponse(err, req);
        return internalErrorResponse(err, req);
    }
};

serve(handler);
