import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

/**
 * Refreshes the Supabase session cookie and does an optimistic auth check for
 * the organizer area. Real authorization happens in the data layer + RLS.
 */
export async function proxy(request: NextRequest) {
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  // What Supabase asked us to write, so it can be replayed onto a redirect.
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const pendingHeaders: Record<string, string> = {};

  const applySession = (res: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    // No-cache headers so a CDN never stores a response carrying a session cookie.
    Object.entries(pendingHeaders).forEach(([name, value]) => res.headers.set(name, value));
    return res;
  };

  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        pendingCookies.push(...cookiesToSet);
        Object.assign(pendingHeaders, headers);
        response = applySession(NextResponse.next({ request }));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?neste=${encodeURIComponent(pathname + search)}`;
    return applySession(NextResponse.redirect(loginUrl));
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/register")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return applySession(NextResponse.redirect(dashboardUrl));
  }

  return response;
}

export const config = {
  // Only organizer/auth routes need the session. Public lists (/a, /b) skip it.
  matcher: ["/dashboard/:path*", "/login", "/register", "/nytt-passord", "/auth/:path*"],
};
