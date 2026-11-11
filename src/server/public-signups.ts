import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbErrorMessage } from "@/lib/errors";
import type { ActionResult, OwnSignup, PublicEvent } from "@/lib/types";

/**
 * Public (no-login) signup operations.
 *
 * These are the only code paths that touch the database on behalf of parents.
 * They validate input, then call controlled SECURITY DEFINER functions with the
 * service role. The database enforces limits and locking; this layer adds
 * input validation, spam protection and friendly errors.
 *
 * Used by both the server actions (web) and /api/v1 route handlers (future
 * native app), so behaviour is identical everywhere.
 */

const TOKEN_RE = /^[A-Za-z0-9_-]{12,64}$/;

export function isValidToken(token: string) {
  return TOKEN_RE.test(token);
}

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Skriv inn navnet ditt.")
    .max(80, "Navnet kan ha maks 80 tegn."),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.email("E-postadressen ser ikke riktig ut.").optional()),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => v || undefined)
    .pipe(
      z
        .string()
        .regex(/^\+?[0-9 ()-]{5,}$/, "Telefonnummeret ser ikke riktig ut.")
        .optional(),
    ),
});

export const itemsSchema = z
  .array(
    z.object({
      item_id: z.uuid(),
      quantity: z.number().int().min(0).max(10000),
    }),
  )
  .max(100);

export const signupSchema = contactSchema.extend({
  items: itemsSchema,
  /** Honeypot – real people never fill this in. */
  website: z.string().optional(),
});

export type SignupPayload = z.input<typeof signupSchema>;

function validationError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  const first = Object.values(fieldErrors)[0] ?? "Ugyldige verdier.";
  return { ok: false, error: first, fieldErrors };
}

/**
 * Secret salt for IP hashing: IP_HASH_SALT, else the Supabase secret key
 * (new name first, then the classic service_role name). Empty or
 * whitespace-only values count as unset.
 *
 * There is deliberately no public fallback constant: an unsalted/known-salt
 * hash of an IPv4 address is trivially reversible. Returning null instead
 * would silently turn off per-IP rate limiting (create_public_signup skips
 * the check when p_ip_hash is null), so we fail loudly. In practice this is
 * unreachable, since signups also need the secret key for the admin client.
 */
function ipHashSalt() {
  for (const name of ["IP_HASH_SALT", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
    const value = process.env[name];
    if (value?.trim()) return value;
  }
  throw new Error(
    "Mangler hemmelig salt for IP-hashing. Sett IP_HASH_SALT (anbefalt) eller SUPABASE_SECRET_KEY.",
  );
}

/** Salted hash of the client IP, used only for rate limiting. */
export function hashIp(ip: string | null | undefined) {
  if (!ip) return null;
  const salt = ipHashSalt();
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}

// ---------------------------------------------------------------------------

export const getPublicEvent = cache(async (token: string): Promise<PublicEvent | null> => {
  if (!isValidToken(token)) return null;
  const { data, error } = await createAdminClient().rpc("get_public_event", { p_token: token });
  if (error) throw new Error(`get_public_event: ${error.message}`);
  return (data as PublicEvent | null) ?? null;
});

export const getOwnSignup = cache(async (editToken: string): Promise<OwnSignup | null> => {
  if (!isValidToken(editToken)) return null;
  const { data, error } = await createAdminClient().rpc("get_signup_by_token", {
    p_edit_token: editToken,
  });
  if (error) throw new Error(`get_signup_by_token: ${error.message}`);
  return (data as OwnSignup | null) ?? null;
});

export async function createSignup(
  token: string,
  payload: SignupPayload,
  ipHash: string | null,
): Promise<ActionResult<{ editToken: string }>> {
  if (!isValidToken(token)) return { ok: false, error: dbErrorMessage({ message: "KF_EVENT_NOT_FOUND" }) };

  const parsed = signupSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);
  const { name, email, phone, items, website } = parsed.data;

  // Honeypot triggered: pretend nothing happened, but don't save anything.
  if (website) return { ok: false, error: "Kunne ikke registrere påmeldingen." };

  const selected = items.filter((i) => i.quantity > 0);
  if (selected.length === 0) return { ok: false, error: "Velg minst ett bidrag." };

  const { data, error } = await createAdminClient().rpc("create_public_signup", {
    p_token: token,
    p_name: name,
    p_email: email ?? null,
    p_phone: phone ?? null,
    p_items: selected,
    p_ip_hash: ipHash,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: { editToken: (data as { edit_token: string }).edit_token } };
}

export async function updateSignup(
  editToken: string,
  payload: SignupPayload,
): Promise<ActionResult> {
  if (!isValidToken(editToken)) return { ok: false, error: dbErrorMessage({ message: "KF_SIGNUP_NOT_FOUND" }) };

  const parsed = signupSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);
  const { name, email, phone, items } = parsed.data;

  const selected = items.filter((i) => i.quantity > 0);
  if (selected.length === 0) {
    return { ok: false, error: "Velg minst ett bidrag, eller avbestill hele påmeldingen." };
  }

  const { error } = await createAdminClient().rpc("update_public_signup", {
    p_edit_token: editToken,
    p_name: name,
    p_email: email ?? null,
    p_phone: phone ?? null,
    p_items: selected,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: undefined };
}

export async function cancelSignup(editToken: string): Promise<ActionResult> {
  if (!isValidToken(editToken)) return { ok: false, error: dbErrorMessage({ message: "KF_SIGNUP_NOT_FOUND" }) };
  const { error } = await createAdminClient().rpc("cancel_public_signup", { p_edit_token: editToken });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, data: undefined };
}
