"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { EVENT_TYPE_VALUES, ITEM_KIND_VALUES } from "@/lib/kinds";
import { findTemplate, type EventTemplate } from "@/lib/templates";
import type { ActionResult } from "@/lib/types";

/**
 * Organizer mutations. All run as the signed-in user, so Row Level Security
 * guarantees they can only touch their own organizations' data.
 */

type Result<T = undefined> = Promise<ActionResult<T>>;

function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { ok: false, error: Object.values(fieldErrors)[0] ?? "Ugyldige verdier.", fieldErrors };
}

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (error: { message?: string; details?: string | null; code?: string } | null): ActionResult<never> => ({
  ok: false,
  error: dbErrorMessage(error),
});

/**
 * True when the database does not have a column the app tried to write, i.e.
 * the 20261113000000_event_types_and_item_kinds migration has not been run yet.
 * The callers then fall back to the columns that have always existed.
 */
const isMissingColumn = (error: { code?: string } | null) => error?.code === "PGRST204" || error?.code === "42703";
const NEEDS_MIGRATION =
  "Dette krever en oppdatering av databasen som ikke er kjørt ennå. Kontakt den som drifter ViStiller.";

const uuid = z.uuid();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maks ${max} tegn.`)
    .optional()
    .transform((v) => v || null);

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

const orgName = z.string().trim().min(1, "Skriv inn et navn.").max(100, "Maks 100 tegn.");

export async function createOrganization(name: string): Result<{ id: string }> {
  const parsed = orgName.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_organization", { p_name: parsed.data });
  if (error) return fail(error);
  refresh();
  return ok({ id: data as string });
}

export async function renameOrganization(id: string, name: string): Result {
  const parsed = orgName.safeParse(name);
  if (!parsed.success || !uuid.safeParse(id).success) return { ok: false, error: "Ugyldig navn." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("organizations").update({ name: parsed.data }).eq("id", id);
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const eventSchema = z.object({
  title: z.string().trim().min(1, "Gi arrangementet et navn.").max(120, "Maks 120 tegn."),
  description: optionalText(2000),
  location: optionalText(200),
  event_date: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.iso.date("Ugyldig dato.").nullable()),
  event_type: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null)
    .pipe(z.enum(EVENT_TYPE_VALUES, "Ugyldig arrangementstype.").nullable()),
});
export type EventInput = z.input<typeof eventSchema>;

/**
 * Creates an event, optionally pre-filled from a template (categories and
 * items the organizer can change afterwards).
 */
export async function createEvent(
  organizationId: string,
  input: EventInput,
  templateId?: string | null,
): Result<{ id: string }> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!uuid.safeParse(organizationId).success) return { ok: false, error: "Velg organisasjon." };

  const { supabase } = await requireUser();
  const { event_type, ...base } = parsed.data;
  const row: Record<string, unknown> = { organization_id: organizationId, ...base };
  let { data, error } = await supabase
    .from("events")
    .insert(event_type ? { ...row, event_type } : row)
    .select("id")
    .single();
  // The type is optional, so an event can still be created on a database without the column.
  if (error && event_type && isMissingColumn(error)) {
    ({ data, error } = await supabase.from("events").insert(row).select("id").single());
  }
  if (error || !data) return fail(error);

  const template = findTemplate(templateId);
  if (template) {
    // Best effort: the event exists either way, and the organizer lands on it and can add items by hand.
    const applied = await applyTemplate(supabase, data.id as string, template);
    if (!applied) console.error(`Kunne ikke fylle arrangement ${data.id} fra malen ${template.id}.`);
  }
  redirect(`/dashboard/events/${data.id}?ny=1`);
}

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function applyTemplate(supabase: Supabase, eventId: string, template: EventTemplate) {
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .insert(template.groups.map((g, i) => ({ event_id: eventId, name: g.category, sort_order: i + 1 })))
    .select("id, name");
  if (categoryError || !categories) return false;

  const categoryId = new Map(categories.map((c) => [c.name as string, c.id as string]));
  let order = 0;
  const rows = template.groups.flatMap((g) =>
    g.items.map((item) => ({
      event_id: eventId,
      category_id: categoryId.get(g.category) ?? null,
      name: item.name,
      description: item.description ?? null,
      target_quantity: item.quantity,
      unit: item.unit,
      allow_extra: item.allow_extra ?? false,
      sort_order: ++order,
      kind: item.kind,
      starts_at: item.starts_at ?? null,
      ends_at: item.ends_at ?? null,
    })),
  );
  let { error } = await supabase.from("items").insert(rows);
  if (error && isMissingColumn(error)) {
    // Older database: keep the list, with the time written into the name instead.
    const legacyRows = rows.map((row) => {
      const { kind, starts_at, ends_at, ...rest } = row;
      void kind;
      return {
        ...rest,
        name: starts_at && ends_at ? `${rest.name} ${starts_at}–${ends_at}`.slice(0, 80) : rest.name,
      };
    });
    ({ error } = await supabase.from("items").insert(legacyRows));
  }
  return !error;
}

export async function updateEvent(id: string, input: EventInput): Result {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  let { error } = await supabase.from("events").update(parsed.data).eq("id", id);
  if (error && isMissingColumn(error)) {
    const { event_type, ...base } = parsed.data;
    if (event_type) return { ok: false, error: NEEDS_MIGRATION };
    ({ error } = await supabase.from("events").update(base).eq("id", id));
  }
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

export async function setEventStatus(id: string, status: "open" | "closed"): Result {
  if (status !== "open" && status !== "closed") return { ok: false, error: "Ugyldig status." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

export async function deleteEvent(id: string): Result {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return fail(error);
  redirect("/dashboard");
}

export async function regenerateShareLink(id: string): Result<{ token: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("regenerate_event_token", { p_event_id: id });
  if (error) return fail(error);
  refresh();
  return ok({ token: data as string });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categoryName = z.string().trim().min(1, "Skriv inn et navn.").max(60, "Maks 60 tegn.");

export async function createCategory(eventId: string, name: string): Result<{ id: string }> {
  const parsed = categoryName.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("categories")
    .insert({ event_id: eventId, name: parsed.data, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return fail(error);
  refresh();
  return ok({ id: data.id as string });
}

export async function renameCategory(id: string, name: string): Result {
  const parsed = categoryName.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("categories").update({ name: parsed.data }).eq("id", id);
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

/** Deletes a category. Its items are kept (they become uncategorized). */
export async function deleteCategory(id: string): Result {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/** Optional "HH:MM". */
const timeOfDay = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v || null)
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Bruk klokkeslett på formen 10:00.")
      .nullable(),
  );

const itemSchema = z.object({
  name: z.string().trim().min(1, "Hva trenger dere?").max(80, "Maks 80 tegn."),
  description: optionalText(500),
  target_quantity: z.coerce
    .number({ error: "Skriv inn et antall." })
    .int("Bruk hele tall.")
    .min(1, "Antallet må være minst 1.")
    .max(100000, "Antallet er for stort."),
  unit: z.string().trim().min(1, "Velg enhet.").max(20, "Maks 20 tegn."),
  category_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  allow_extra: z.boolean().default(false),
  kind: z.enum(ITEM_KIND_VALUES).default("bring"),
  starts_at: timeOfDay,
  ends_at: timeOfDay,
});
export type ItemInput = z.input<typeof itemSchema>;

export async function saveItem(eventId: string, itemId: string | null, input: ItemInput): Result {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();

  // On a database without the kind/time columns, a plain "bring" item can still be saved.
  const { kind, starts_at, ends_at, ...legacy } = parsed.data;
  const isPlain = kind === "bring" && !starts_at && !ends_at;

  if (itemId) {
    let { error } = await supabase.from("items").update(parsed.data).eq("id", itemId);
    if (error && isMissingColumn(error)) {
      if (!isPlain) return { ok: false, error: NEEDS_MIGRATION };
      ({ error } = await supabase.from("items").update(legacy).eq("id", itemId));
    }
    if (error) return fail(error);
  } else {
    const { data: last } = await supabase
      .from("items")
      .select("sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = (last?.sort_order ?? 0) + 1;
    let { error } = await supabase.from("items").insert({ event_id: eventId, ...parsed.data, sort_order });
    if (error && isMissingColumn(error)) {
      if (!isPlain) return { ok: false, error: NEEDS_MIGRATION };
      ({ error } = await supabase.from("items").insert({ event_id: eventId, ...legacy, sort_order }));
    }
    if (error) return fail(error);
  }
  refresh();
  return ok(undefined);
}

/**
 * Deletes an item and the contributions to it. People whose only contribution
 * was to this item would otherwise be left as empty sign-ups that still count
 * as "påmeldt", so those are removed as well (same rule as deleteContribution).
 */
export async function deleteItem(id: string): Result {
  const { supabase } = await requireUser();
  const { data: affected } = await supabase.from("contributions").select("signup_id").eq("item_id", id);
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return fail(error);

  const signupIds = [...new Set((affected ?? []).map((c) => c.signup_id as string))];
  if (signupIds.length > 0) {
    const { data: remaining } = await supabase.from("contributions").select("signup_id").in("signup_id", signupIds);
    if (remaining) {
      const stillActive = new Set(remaining.map((c) => c.signup_id as string));
      const empty = signupIds.filter((signupId) => !stillActive.has(signupId));
      if (empty.length > 0) await supabase.from("signups").delete().in("id", empty);
    }
  }
  refresh();
  return ok(undefined);
}

/** Swap an item with its neighbour (simple, robust reordering). */
export async function moveItem(id: string, direction: "up" | "down"): Result {
  const { supabase } = await requireUser();
  const { data: item } = await supabase.from("items").select("id, event_id, category_id").eq("id", id).maybeSingle();
  if (!item) return fail({ message: "KF_NOT_FOUND" });

  let query = supabase.from("items").select("id, sort_order").eq("event_id", item.event_id);
  query = item.category_id ? query.eq("category_id", item.category_id) : query.is("category_id", null);
  const { data: siblings, error } = await query.order("sort_order").order("created_at");
  if (error || !siblings) return fail(error);

  const index = siblings.findIndex((s) => s.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= siblings.length) return ok(undefined);

  // Renumber so equal sort_orders don't make swaps a no-op.
  const ordered = siblings.map((s) => s.id);
  [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
  const results = await Promise.all(
    ordered.map((itemId, i) => supabase.from("items").update({ sort_order: i + 1 }).eq("id", itemId)),
  );
  const failed = results.find((r) => r.error);
  if (failed) return fail(failed.error);
  refresh();
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

const manualSchema = z.object({
  name: z.string().trim().min(1, "Skriv inn navn.").max(80, "Maks 80 tegn."),
  quantity: z.coerce.number().int("Bruk hele tall.").min(1, "Minst 1.").max(100000),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(z.email("Ugyldig e-post.").nullable()),
});
export type ManualContributionInput = z.input<typeof manualSchema>;

export async function addManualContribution(itemId: string, input: ManualContributionInput): Result {
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_manual_contribution", {
    p_item_id: itemId,
    p_name: parsed.data.name,
    p_quantity: parsed.data.quantity,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone,
  });
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

export async function setDelivered(contributionId: string, delivered: boolean): Result {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("contributions")
    .update({ delivered_at: delivered ? new Date().toISOString() : null })
    .eq("id", contributionId);
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

export async function updateContributionQuantity(contributionId: string, quantity: number): Result {
  const parsed = z.number().int().min(1).max(100000).safeParse(quantity);
  if (!parsed.success) return { ok: false, error: "Ugyldig antall." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("contributions").update({ quantity: parsed.data }).eq("id", contributionId);
  if (error) return fail(error);
  refresh();
  return ok(undefined);
}

/** Removes one contribution; deletes the whole signup if it was its last one. */
export async function deleteContribution(contributionId: string): Result {
  const { supabase } = await requireUser();
  const { data: row, error: readError } = await supabase
    .from("contributions")
    .select("id, signup_id")
    .eq("id", contributionId)
    .maybeSingle();
  if (readError || !row) return fail(readError ?? { message: "KF_NOT_FOUND" });

  const { error } = await supabase.from("contributions").delete().eq("id", contributionId);
  if (error) return fail(error);

  const { count } = await supabase
    .from("contributions")
    .select("id", { count: "exact", head: true })
    .eq("signup_id", row.signup_id);
  if (count === 0) await supabase.from("signups").delete().eq("id", row.signup_id);

  refresh();
  return ok(undefined);
}
