import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Options for the Supabase auth cookies, shared by the proxy and the server
 * client. @supabase/ssr merges these over its defaults (path "/", 400-day
 * maxAge) for both setting and clearing cookies.
 *
 * The app has no browser Supabase client, so JavaScript never needs to read
 * the session: keep it httpOnly. `secure` is off in development so login
 * works on http://localhost.
 *
 * Do not set `name` here: it would change the storage key (cookie name).
 */
export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
