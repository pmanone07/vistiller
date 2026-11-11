import { clientIp, createSignup, hashIp, type SignupPayload } from "@/server/public-signups";
import { json, preflight, readJson } from "@/server/http";

/**
 * POST /api/v1/events/:token/signups
 * Body: { name, email?, phone?, items: [{ item_id, quantity }] }
 * Returns: { editToken } – keep it; it's the only way to edit/cancel later.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/events/[token]/signups">) {
  const { token } = await ctx.params;
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json(request, { error: "Ugyldig forespørsel." }, 400);

  const result = await createSignup(token, body as SignupPayload, hashIp(clientIp(request.headers)));
  if (!result.ok) return json(request, { error: result.error, fieldErrors: result.fieldErrors }, 422);
  return json(request, result.data, 201);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
