import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends an already signed-in organizer on to the dashboard. Render inside
 * <Suspense>.
 *
 * Uses the same check as `requireUser` (getUser, verified by Supabase), so the
 * two can never disagree. A locally verified token (getClaims) can still look
 * valid after the session was revoked, e.g. by signing out on another device;
 * redirecting on that would bounce between /login and /dashboard forever.
 */
export async function RedirectIfSignedIn() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) redirect("/dashboard");
  return null;
}
