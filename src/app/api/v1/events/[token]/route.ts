import { getPublicEvent, isValidToken } from "@/server/public-signups";
import { json, preflight } from "@/server/http";

/** GET /api/v1/events/:token – public event with items and allocated amounts. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/events/[token]">) {
  const { token } = await ctx.params;
  if (!isValidToken(token)) return json(request, { error: "Lenken er ikke gyldig." }, 400);
  try {
    const event = await getPublicEvent(token);
    if (!event) return json(request, { error: "Fant ikke arrangementet." }, 404);
    return json(request, event);
  } catch (error) {
    // Details stay in the server log; the caller only learns it is temporary.
    console.error(error);
    return json(request, { error: "Tjenesten er midlertidig utilgjengelig. Prøv igjen om litt." }, 503);
  }
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
