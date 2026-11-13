import { Car, Clock, HandHelping, ShoppingBasket, type LucideIcon } from "lucide-react";

/**
 * Event types and contribution kinds.
 *
 * An event can combine all kinds in one list: cakes to bring, tasks to do,
 * shifts to cover and transport to help with. Every kind is still "N of
 * something is needed", so progress, limits and sign-up work the same way;
 * the kind only changes wording, icons and sensible defaults.
 */

export const EVENT_TYPES = [
  { value: "school", label: "Skolearrangement" },
  { value: "sports", label: "Idrettsarrangement" },
  { value: "culture", label: "Korps og kultur" },
  { value: "dugnad", label: "Dugnad" },
  { value: "social", label: "Sosial sammenkomst" },
  { value: "fundraising", label: "Innsamling eller salg" },
  { value: "other", label: "Annet" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];

export const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value) as [EventType, ...EventType[]];

export function eventTypeLabel(value: string | null | undefined) {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? null;
}

export const ITEM_KIND_VALUES = ["bring", "task", "shift", "transport"] as const;
export type ItemKind = (typeof ITEM_KIND_VALUES)[number];

interface KindInfo {
  /** Chooser label for the organizer. */
  label: string;
  /** Short tag shown on cards. */
  tag: string;
  icon: LucideIcon;
  /** Button the participant presses. */
  cta: string;
  /** "Levert" / "Utført": what the organizer ticks off. */
  done: string;
  defaultUnit: string;
  units: string[];
  namePlaceholder: string;
  suggestions: { name: string; unit: string; qty: number; starts_at?: string; ends_at?: string }[];
}

export const ITEM_KINDS: Record<ItemKind, KindInfo> = {
  bring: {
    label: "Ta med noe",
    tag: "Ta med",
    icon: ShoppingBasket,
    cta: "Jeg tar med",
    done: "Levert",
    defaultUnit: "stk",
    units: ["stk", "liter", "kg", "poser", "brett", "pakker", "flasker", "kanner"],
    namePlaceholder: "F.eks. Sjokoladekake",
    suggestions: [
      { name: "Kake", unit: "stk", qty: 6 },
      { name: "Kaffe", unit: "kanner", qty: 4 },
      { name: "Saft", unit: "liter", qty: 5 },
      { name: "Frukt", unit: "stk", qty: 4 },
      { name: "Boller", unit: "stk", qty: 40 },
      { name: "Premier", unit: "stk", qty: 10 },
      { name: "Servietter", unit: "pakker", qty: 3 },
    ],
  },
  task: {
    label: "Utføre en oppgave",
    tag: "Oppgave",
    icon: HandHelping,
    cta: "Jeg hjelper til",
    done: "Utført",
    defaultUnit: "personer",
    units: ["personer", "timer"],
    namePlaceholder: "F.eks. Rigge scene",
    suggestions: [
      { name: "Rigging", unit: "personer", qty: 4 },
      { name: "Rydding", unit: "personer", qty: 4 },
      { name: "Sette opp bord og stoler", unit: "personer", qty: 3 },
      { name: "Hjelpe til i garderoben", unit: "personer", qty: 2 },
      { name: "Pynte lokalet", unit: "personer", qty: 3 },
    ],
  },
  shift: {
    label: "Stille på vakt",
    tag: "Vakt",
    icon: Clock,
    cta: "Jeg tar vakten",
    done: "Møtt",
    defaultUnit: "personer",
    units: ["personer"],
    namePlaceholder: "F.eks. Kioskvakt",
    suggestions: [
      { name: "Kioskvakt", unit: "personer", qty: 2, starts_at: "10:00", ends_at: "12:00" },
      { name: "Kioskvakt", unit: "personer", qty: 2, starts_at: "12:00", ends_at: "14:00" },
      { name: "Billettkontroll", unit: "personer", qty: 2 },
      { name: "Parkeringsvakt", unit: "personer", qty: 2 },
      { name: "Kafévakt", unit: "personer", qty: 3 },
    ],
  },
  transport: {
    label: "Hjelpe med transport",
    tag: "Transport",
    icon: Car,
    cta: "Jeg kan kjøre",
    done: "Utført",
    defaultUnit: "biler",
    units: ["biler", "seter", "turer", "personer"],
    namePlaceholder: "F.eks. Kjøre til kamp",
    suggestions: [
      { name: "Kjøre deltakere", unit: "biler", qty: 4 },
      { name: "Frakte utstyr", unit: "biler", qty: 2 },
      { name: "Hente lopper", unit: "biler", qty: 3 },
    ],
  },
};

/** Tolerates rows from before the kind column existed. */
export function itemKind(value: string | null | undefined): ItemKind {
  return (ITEM_KIND_VALUES as readonly string[]).includes(value ?? "") ? (value as ItemKind) : "bring";
}

export function kindInfo(value: string | null | undefined) {
  return ITEM_KINDS[itemKind(value)];
}

/** "10:00:00" or "10:00" -> "10:00"; anything else -> "". */
export function timeValue(value: string | null | undefined) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(value ?? "");
  return match ? `${match[1]}:${match[2]}` : "";
}

/** "10:00–12:00", "fra 10:00", "til 12:00" or null. */
export function formatTimeRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  const start = timeValue(startsAt);
  const end = timeValue(endsAt);
  if (start && end) return `${start}–${end}`;
  if (start) return `fra ${start}`;
  if (end) return `til ${end}`;
  return null;
}

/** "Levert", "Utført" or "Møtt", for one item. */
export function doneLabel(kind: string | null | undefined) {
  return kindInfo(kind).done;
}
