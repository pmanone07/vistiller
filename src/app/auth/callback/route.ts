import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Redirect to a same-site path with a relative `Location`. The browser
 * resolves it against the URL it actually requested (our public host), so we
 * never depend on `request.nextUrl.origin` (can be an internal host behind a
 * reverse proxy) or on NEXT_PUBLIC_SITE_URL being set. It also guarantees the
 * session cookie set on this response and the redirect target share a host.
 * `path` must come from `safeNextPath` or be a constant.
 */
function redirectToPath(path: string) {
  return new Response(null, {
    status: 307, // same status NextResponse.redirect used before
    headers: {
      Location: path,
      // This response carries the new session cookie: never cache it.
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache",
    },
  });
}

/**
 * Landing point for links in Supabase emails (confirm signup, reset password).
 * Supports both the PKCE `code` flow and the `token_hash` flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (ok) return redirectToPath(next);
  return redirectToPath("/login?feil=lenke");
}
