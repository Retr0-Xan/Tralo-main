/**
 * Shared security utilities for Supabase Edge Functions.
 * Import with:  import { ... } from "../_shared/security.ts";
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/**
 * Locked-down CORS headers.
 * Replace the origin list with your actual production domain(s).
 * The wildcard ("*") is intentionally removed to prevent cross-origin abuse.
 */
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(o => o.trim()).filter(Boolean);

export function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("origin") ?? "";
    const allowed =
        ALLOWED_ORIGINS.length === 0 || // dev mode – no env var set
        ALLOWED_ORIGINS.includes(origin);

    return {
        "Access-Control-Allow-Origin": allowed ? origin : "",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
    };
}

export function corsPreflightResponse(req: Request): Response {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-isolate window)
// For production, prefer a Supabase table or Upstash Redis as the backing store.
// ---------------------------------------------------------------------------

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple token-bucket rate limiter.
 * @param key      Unique key (e.g. IP or user ID)
 * @param max      Max requests per window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return true; // allowed
    }

    if (entry.count >= max) {
        return false; // rate limited
    }

    entry.count++;
    return true;
}

export function rateLimitedResponse(req: Request): Response {
    return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": "60",
                ...getCorsHeaders(req),
            },
        }
    );
}

/** Extract best-effort client identifier (IP → fallback to user-agent) */
export function getClientId(req: Request): string {
    return (
        req.headers.get("x-real-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("user-agent") ??
        "unknown"
    );
}

// ---------------------------------------------------------------------------
// Authentication helpers
// ---------------------------------------------------------------------------

/**
 * Verify the Bearer JWT from the Authorization header and return the
 * authenticated user.  Throws if the token is missing or invalid.
 */
export async function requireAuth(req: Request): Promise<{ user: any; supabase: SupabaseClient }> {
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!jwt) {
        throw new AuthError("Missing authorization header", 401);
    }

    // Use the anon key + JWT to get the authenticated user
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new AuthError("Invalid or expired token", 401);
    }

    return { user, supabase };
}

export class AuthError extends Error {
    status: number;
    constructor(message: string, status = 401) {
        super(message);
        this.status = status;
    }
}

export function authErrorResponse(err: AuthError, req: Request): Response {
    return new Response(
        JSON.stringify({ error: err.message }),
        {
            status: err.status,
            headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
    );
}

// ---------------------------------------------------------------------------
// Input sanitisation / XSS prevention
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters.
 * Use this whenever user-supplied text is interpolated into HTML templates.
 */
export function escapeHtml(raw: unknown): string {
    return String(raw ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
}

/**
 * Strip any character that isn't safe in a Content-Disposition filename.
 * Prevents header injection.
 */
export function safeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

// ---------------------------------------------------------------------------
// Generic error response (no internal leakage)
// ---------------------------------------------------------------------------

/**
 * Return a safe 500 without leaking internal error details to the client.
 * The real error is only written to console (server-side logs).
 */
export function internalErrorResponse(err: unknown, req: Request): Response {
    console.error("[INTERNAL ERROR]", err);
    return new Response(
        JSON.stringify({ error: "An internal error occurred. Please try again." }),
        {
            status: 500,
            headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
    );
}

// ---------------------------------------------------------------------------
// Content Security Policy for generated HTML documents
// ---------------------------------------------------------------------------

/**
 * A strict CSP for server-generated HTML receipts / invoices.
 * Blocks inline script execution – the main XSS mitigation for stored HTML.
 */
export const DOCUMENT_CSP =
    "default-src 'none'; " +
    "style-src 'unsafe-inline'; " +   // inline styles are required for the document layout
    "img-src data: https:; " +         // data URIs for embedded QR codes
    "font-src 'self' https://fonts.gstatic.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'none'; " +
    "form-action 'none'";
