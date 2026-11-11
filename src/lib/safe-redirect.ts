/** Fixed dummy origin used only to check where a path would resolve to. */
const CHECK_ORIGIN = "https://korpsfix.invalid";

/**
 * Only allow same-site relative paths as post-login redirect targets.
 * Returns a normalised path (`pathname + search + hash`) that starts with a
 * single `/`, or `fallback`.
 */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  // URL parsers strip tab/CR/LF and treat `\` like `/`, so "/\t/evil.com" or
  // "/\\evil.com" would turn into a protocol-relative URL. Reject them outright.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  let url: URL;
  try {
    url = new URL(value, CHECK_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== CHECK_ORIGIN) return fallback;

  const path = url.pathname + url.search + url.hash;
  // Belt and braces: the normalised result must itself be a single-slash path.
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}
