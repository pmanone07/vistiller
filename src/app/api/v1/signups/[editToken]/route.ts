import { cancelSignup, getOwnSignup, updateSignup, type SignupPayload } from "@/server/public-signups";
import { json, preflight, readJson } from "@/server/http";

type Ctx = RouteContext<"/api/v1/signups/[editToken]">;

/** GET /api/v1/signups/:editToken – the person's own signup + event. */
export async function GET(request: Request, ctx: Ctx) {
  const { editToken } = await ctx.params;
  const data = await getOwnSignup(editToken);
  if (!data) return json(request, { error: "Fant ikke påmeldingen." }, 404);
  return json(request, data);
}

/** PATCH /api/v1/signups/:editToken – replace contact info and quantities. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { editToken } = await ctx.params;
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json(request, { error: "Ugyldig forespørsel." }, 400);

  const result = await updateSignup(editToken, body as SignupPayload);
  if (!result.ok) return json(request, { error: result.error, fieldErrors: result.fieldErrors }, 422);
  return json(request, { ok: true });
}

/** DELETE /api/v1/signups/:editToken – cancel the signup. */
export async function DELETE(request: Request, ctx: Ctx) {
  const { editToken } = await ctx.params;
  const result = await cancelSignup(editToken);
  if (!result.ok) return json(request, { error: result.error }, 422);
  return json(request, { ok: true });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
