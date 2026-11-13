import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Privileged Supabase client (service role). Only used on the server to call
 * the controlled public functions (get_public_event, create_public_signup …).
 * Never expose this client or its key to the browser.
 */
export function createAdminClient(): SupabaseClient {
  // An empty `SUPABASE_SECRET_KEY=` line must not hide a valid classic key.
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!SUPABASE_URL || !key) {
    throw new Error(
      "Supabase er ikke konfigurert. Sett SUPABASE_SECRET_KEY (i .env.local lokalt, som miljøvariabel i Vercel i produksjon).",
    );
  }
  client ??= createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
