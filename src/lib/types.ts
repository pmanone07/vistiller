import type { EventType, ItemKind } from "@/lib/kinds";

export type EventStatus = "open" | "closed" | "archived";

export interface Organization {
  id: string;
  name: string;
  plan: "free" | "pro";
  created_at: string;
}

export interface EventRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  /** Missing until the 20261113000000_event_types_and_item_kinds migration has run. */
  event_type?: EventType | null;
  public_token: string;
  status: EventStatus;
  created_at: string;
}

export interface Category {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
}

export interface Item {
  id: string;
  event_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  /** kind / starts_at / ends_at are missing until the 20261113000000 migration has run. */
  kind?: ItemKind;
  starts_at?: string | null;
  ends_at?: string | null;
  target_quantity: number;
  unit: string;
  allow_extra: boolean;
  sort_order: number;
}

export interface Signup {
  id: string;
  contributor_name: string;
  contributor_email: string | null;
  contributor_phone: string | null;
  source: "public" | "manual";
  created_at: string;
}

export interface Contribution {
  id: string;
  item_id: string;
  signup_id: string;
  quantity: number;
  delivered_at: string | null;
  created_at: string;
}

/** A contribution joined with the person who signed up (organizer view). */
export interface ContributionWithSignup extends Contribution {
  signup: Signup;
}

// ---------------------------------------------------------------------------
// Public (parent-facing) shapes, returned by the database functions.
// These never contain other people's contact details.
// ---------------------------------------------------------------------------

export interface PublicItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  kind?: ItemKind;
  /** "HH:MM" */
  starts_at?: string | null;
  ends_at?: string | null;
  target_quantity: number;
  unit: string;
  allow_extra: boolean;
  sort_order: number;
  allocated: number;
  /**
   * Quantity the organizer has marked as delivered. Missing until the
   * 20261112000000_public_delivered migration has been applied.
   */
  delivered?: number;
}

export interface PublicEvent {
  token: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  event_type?: EventType | null;
  status: EventStatus;
  organization_name: string;
  contributor_count: number;
  categories: { id: string; name: string; sort_order: number }[];
  items: PublicItem[];
}

export interface OwnSignup {
  signup: {
    id: string;
    contributor_name: string;
    contributor_email: string | null;
    contributor_phone: string | null;
    created_at: string;
    updated_at: string;
  };
  contributions: { item_id: string; quantity: number; delivered_at: string | null }[];
  event: PublicEvent;
}

export interface SignupItemInput {
  item_id: string;
  quantity: number;
}

export interface ContactInput {
  name: string;
  email?: string;
  phone?: string;
}

/** Standard result shape for server actions and API helpers. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
