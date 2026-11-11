import { getPublicEvent } from "@/server/public-signups";
import { json, preflight } from "@/server/http";

/** GET /api/v1/events/:token – public event with items and allocated amounts. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/events/[token]">) {
  const { token } = await ctx.params;
  const event = await getPublicEvent(token);
  if (!event) return json(request, { error: "Fant ikke arrangementet." }, 404);
  return json(request, event);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
