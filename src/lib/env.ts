/**
 * Supabase configuration. Accepts both the classic Next.js names
 * (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) and the names the Supabase dashboard
 * and Vercel integration hand out (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).
 * Only used on the server.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
export const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ""
).trim();

/** Canonical site URL, used for share links, QR codes and auth redirects. */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  // On Vercel, fall back to the production domain so a missing variable can
  // never produce share links pointing at localhost.
  (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
).replace(/\/$/, "");

export function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase er ikke konfigurert. Sett SUPABASE_URL og SUPABASE_PUBLISHABLE_KEY i .env.local.",
    );
  }
}
