import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { overallCoverage } from "@/lib/format";
import type { Category, ContributionWithSignup, EventRow, Item } from "@/lib/types";

/** Organizer-side data access. Every query runs as the user, so RLS applies. */

export interface EventSummary extends EventRow {
  itemCount: number;
  completeCount: number;
  coverage: number;
  signupCount: number;
}

interface EventOverviewRow extends EventRow {
  items: { id: string; target_quantity: number; contributions: { quantity: number }[] }[];
  signups: { count: number }[];
}

export async function getEventSummaries(): Promise<EventSummary[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, organization_id, title, description, location, event_date, public_token, status, created_at, items(id, target_quantity, contributions(quantity)), signups(count)",
    )
    .neq("status", "archived")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as EventOverviewRow[]).map(({ items, signups, ...event }) => {
    const withAllocated = items.map((i) => ({
      target_quantity: i.target_quantity,
      allocated: i.contributions.reduce((sum, c) => sum + c.quantity, 0),
    }));
    return {
      ...event,
      itemCount: items.length,
      completeCount: withAllocated.filter((i) => i.allocated >= i.target_quantity).length,
      coverage: overallCoverage(withAllocated),
      signupCount: signups[0]?.count ?? 0,
    };
  });
}

export interface AdminItem extends Item {
  allocated: number;
  contributions: ContributionWithSignup[];
}

export interface EventDetail {
  event: EventRow & { organization: { id: string; name: string } };
  categories: Category[];
  items: AdminItem[];
  stats: {
    signupCount: number;
    coverage: number;
    missingCount: number;
    deliveredCount: number;
    contributionCount: number;
  };
}

export async function getEventDetail(id: string): Promise<EventDetail> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireUser();

  const [eventRes, categoriesRes, itemsRes, contributionsRes, signupCountRes] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, organization_id, title, description, location, event_date, public_token, status, created_at, organization:organizations(id, name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, event_id, name, sort_order").eq("event_id", id).order("sort_order").order("created_at"),
    supabase
      .from("items")
      .select("id, event_id, category_id, name, description, target_quantity, unit, allow_extra, sort_order")
      .eq("event_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("contributions")
      .select(
        "id, item_id, signup_id, quantity, delivered_at, created_at, signup:signups(id, contributor_name, contributor_email, contributor_phone, source, created_at)",
      )
      .eq("event_id", id)
      .order("created_at"),
    supabase.from("signups").select("id", { count: "exact", head: true }).eq("event_id", id),
  ]);

  for (const res of [eventRes, categoriesRes, itemsRes, contributionsRes, signupCountRes]) {
    if (res.error) throw res.error;
  }
  if (!eventRes.data) notFound();

  const contributions = (contributionsRes.data ?? []) as unknown as ContributionWithSignup[];
  const items: AdminItem[] = ((itemsRes.data ?? []) as Item[]).map((item) => {
    const own = contributions.filter((c) => c.item_id === item.id);
    return { ...item, contributions: own, allocated: own.reduce((sum, c) => sum + c.quantity, 0) };
  });

  return {
    event: eventRes.data as unknown as EventDetail["event"],
    categories: (categoriesRes.data ?? []) as Category[],
    items,
    stats: {
      signupCount: signupCountRes.count ?? 0,
      coverage: overallCoverage(items),
      missingCount: items.filter((i) => i.allocated < i.target_quantity).length,
      deliveredCount: contributions.filter((c) => c.delivered_at).length,
      contributionCount: contributions.length,
    },
  };
}
