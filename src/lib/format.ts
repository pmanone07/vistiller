const dateFormatter = new Intl.DateTimeFormat("nb-NO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDateFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dateTimeFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Oslo",
});
const numberFormatter = new Intl.NumberFormat("nb-NO");

/** "lørdag 24. april 2027". event_date is a plain date (YYYY-MM-DD). */
export function formatEventDate(date: string | null, style: "long" | "short" = "long") {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const text = (style === "long" ? dateFormatter : shortDateFormatter).format(d);
  return style === "long" ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatNumber(n: number) {
  return numberFormatter.format(n);
}

/** "10 stk", "20 liter" */
export function formatQuantity(n: number, unit: string) {
  return `${formatNumber(n)} ${unit}`;
}

export function percent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

export interface ItemProgress {
  allocated: number;
  target: number;
  remaining: number;
  percent: number;
  complete: boolean;
  extra: number;
}

export function itemProgress(allocated: number, target: number): ItemProgress {
  return {
    allocated,
    target,
    remaining: Math.max(target - allocated, 0),
    percent: percent(allocated, target),
    complete: allocated >= target,
    extra: Math.max(allocated - target, 0),
  };
}

/** Aggregate coverage across items: each item counts at most 100 %. */
export function overallCoverage(items: { allocated: number; target_quantity: number }[]) {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, i) => acc + Math.min(i.allocated / i.target_quantity, 1), 0);
  return Math.round((sum / items.length) * 100);
}

/** plural(2, "forelder", "foreldre") */
export function plural(n: number, singular: string, pluralForm: string) {
  return n === 1 ? singular : pluralForm;
}
