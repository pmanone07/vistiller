import type { EventType, ItemKind } from "@/lib/kinds";

/**
 * Ready-made starting points for common events. A template only pre-fills
 * categories and items; the organizer can change or delete everything
 * afterwards. Quantities are deliberately modest defaults.
 */

export interface TemplateItem {
  name: string;
  kind: ItemKind;
  quantity: number;
  unit: string;
  starts_at?: string;
  ends_at?: string;
  description?: string;
  allow_extra?: boolean;
}

export interface EventTemplate {
  id: string;
  name: string;
  eventType: EventType;
  summary: string;
  groups: { category: string; items: TemplateItem[] }[];
}

const people = (name: string, kind: ItemKind, quantity: number, extra: Partial<TemplateItem> = {}): TemplateItem => ({
  name,
  kind,
  quantity,
  unit: "personer",
  ...extra,
});

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "skoleavslutning",
    name: "Skoleavslutning",
    eventType: "school",
    summary: "Kaker, drikke, rigging og rydding",
    groups: [
      {
        category: "Mat og drikke",
        items: [
          { name: "Kaker", kind: "bring", quantity: 6, unit: "stk" },
          { name: "Kaffe", kind: "bring", quantity: 4, unit: "kanner" },
          { name: "Saft", kind: "bring", quantity: 5, unit: "liter" },
          { name: "Frukt", kind: "bring", quantity: 4, unit: "fat" },
        ],
      },
      {
        category: "Oppgaver",
        items: [people("Rigging", "task", 4), people("Rydding", "task", 4)],
      },
      {
        category: "Annet",
        items: [{ name: "Andre bidrag", kind: "bring", quantity: 5, unit: "stk", allow_extra: true }],
      },
    ],
  },
  {
    id: "fotballcup",
    name: "Fotballcup",
    eventType: "sports",
    summary: "Kioskvakter, kampverter, kaker og transport",
    groups: [
      {
        category: "Vakter",
        items: [
          people("Kioskvakt", "shift", 2, { starts_at: "09:00", ends_at: "12:00" }),
          people("Kioskvakt", "shift", 2, { starts_at: "12:00", ends_at: "15:00" }),
          people("Kampverter", "shift", 4),
        ],
      },
      {
        category: "Til kiosken",
        items: [
          { name: "Bake kaker", kind: "bring", quantity: 10, unit: "stk" },
          { name: "Kaffe", kind: "bring", quantity: 6, unit: "kanner" },
        ],
      },
      {
        category: "Transport",
        items: [{ name: "Transport", kind: "transport", quantity: 3, unit: "biler" }],
      },
      {
        category: "Oppgaver",
        items: [people("Rigging", "task", 4), people("Rydding", "task", 4)],
      },
    ],
  },
  {
    id: "loppemarked",
    name: "Loppemarked",
    eventType: "culture",
    summary: "Henting, sortering, salgsvakter og kafé",
    groups: [
      {
        category: "Før markedet",
        items: [
          { name: "Henting av lopper", kind: "transport", quantity: 4, unit: "biler" },
          people("Sortering", "task", 8),
          { name: "Transport", kind: "transport", quantity: 2, unit: "biler" },
        ],
      },
      {
        category: "Markedsdagen",
        items: [people("Salgsvakter", "shift", 8), people("Kafévakter", "shift", 4)],
      },
      {
        category: "Etterpå",
        items: [people("Opprydding", "task", 6)],
      },
    ],
  },
  {
    id: "skoleforestilling",
    name: "Skoleforestilling",
    eventType: "school",
    summary: "Kostymer, scene, kafé og billetter",
    groups: [
      {
        category: "Forberedelser",
        items: [people("Kostymer og rekvisitter", "task", 4), people("Scenerigging", "task", 4)],
      },
      {
        category: "Under forestillingen",
        items: [people("Kafé", "shift", 3), people("Billettkontroll", "shift", 2)],
      },
      {
        category: "Etterpå",
        items: [people("Rydding", "task", 4)],
      },
    ],
  },
  {
    id: "dugnad",
    name: "Dugnad",
    eventType: "dugnad",
    summary: "Oppgaver, utstyr og noe å bite i",
    groups: [
      {
        category: "Oppgaver",
        items: [people("Rydding ute", "task", 8), people("Vask og maling", "task", 4)],
      },
      {
        category: "Ta med",
        items: [
          { name: "Hageredskaper", kind: "bring", quantity: 6, unit: "stk" },
          { name: "Kaffe", kind: "bring", quantity: 3, unit: "kanner" },
          { name: "Noe å bite i", kind: "bring", quantity: 3, unit: "stk" },
        ],
      },
    ],
  },
];

export function findTemplate(id: string | null | undefined) {
  return EVENT_TEMPLATES.find((t) => t.id === id) ?? null;
}
