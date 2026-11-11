import "server-only";
import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { assertSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

/**
 * Supabase client acting as the signed-in organizer (RLS applies).
 * Use in Server Components, Server Actions and Route Handlers.
 */
export async function createClient() {
  // Read cookies first: during the build-time prerender this suspends, so the
  // caller's nearest <Suspense> fallback goes into the static shell.
  const cookieStore = await cookies();
  // Cookies do resolve in the per-session App Shell prerender (Partial
  // Prefetching), but supabase-js compares the session expiry with Date.now()
  // on every getUser() and query, which Cache Components rejects while
  // prerendering. io() keeps everything below out of every prerender; during a
  // real request (pages, Server Actions, Route Handlers) it resolves at once.
  await io();
  assertSupabaseConfigured();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component – the proxy refreshes the session instead.
        }
      },
    },
  });
}
