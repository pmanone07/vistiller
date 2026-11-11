import "server-only";

/**
 * Small helpers for the public JSON API (/api/v1). The API mirrors the server
 * actions so a native wrapper (e.g. Capacitor) can use the same backend.
 *
 * Allowed cross-origin callers are configured with API_ALLOWED_ORIGINS
 * (comma separated), e.g. "capacitor://localhost,https://localhost".
 */
function allowedOrigins() {
  return (process.env.API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...corsHeaders(request) },
  });
}

export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}
