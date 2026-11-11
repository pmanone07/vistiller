"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, PackageCheck, PartyPopper, Phone, Users } from "lucide-react";
import { formatDateTime, formatNumber, percent } from "@/lib/format";
import { groupItems } from "@/lib/group";
import { cn } from "@/lib/utils";
import type { ContributionWithSignup } from "@/lib/types";
import type { AdminItem, EventDetail } from "@/server/dashboard";
import { setDelivered } from "../../../actions";
import { DeliveredToggle } from "../delivered-toggle";

type Filter = "missing" | "delivered" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "missing", label: "Mangler" },
  { key: "delivered", label: "Levert" },
  { key: "all", label: "Alle" },
];

const matches = (c: ContributionWithSignup, filter: Filter) =>
  filter === "all" || (filter === "delivered" ? Boolean(c.delivered_at) : !c.delivered_at);

/** Delivery overview: what has and has not been delivered, with quick ticking. */
export function DeliveryOverview({ detail }: { detail: EventDetail }) {
  const { event, categories, items } = detail;
  const [filter, setFilter] = useState<Filter>("missing");

  const total = detail.stats.contributionCount;
  const delivered = detail.stats.deliveredCount;
  const remaining = total - delivered;
  const counts: Record<Filter, number> = { missing: remaining, delivered, all: total };
  const allDelivered = total > 0 && remaining === 0;

  const groups = useMemo(
    () =>
      groupItems(items, categories)
        .map((group) => ({
          ...group,
          items: group.items
            .map((item) => ({ item, rows: item.contributions.filter((c) => matches(c, filter)) }))
            .filter((entry) => entry.rows.length > 0),
        }))
        .filter((group) => group.items.length > 0),
    [items, categories, filter],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="inline-flex max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" /> <span className="truncate">{event.title}</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Leveringsoversikt</h1>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed bg-card/50 px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-muted">
            <Users className="size-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Ingen har meldt seg på ennå</h2>
            <p className="max-w-sm text-muted-foreground">
              Når foreldre melder seg på, ser du her hva som er levert og hva som mangler.
            </p>
          </div>
          <Link href={`/dashboard/events/${event.id}`} className="text-sm font-medium text-primary hover:underline">
            Tilbake til arrangementet
          </Link>
        </div>
      ) : (
        <>
          <Summary delivered={delivered} total={total} remaining={remaining} />

          {/* Filter */}
          <div className="grid grid-cols-3 rounded-xl bg-muted p-1 sm:inline-grid" role="tablist" aria-label="Vis bidrag">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  filter === key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-xs tabular-nums",
                    filter === key ? "bg-muted text-foreground" : "bg-background/60",
                  )}
                >
                  {formatNumber(counts[key])}
                </span>
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            filter === "missing" && allDelivered ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-success-muted px-6 py-10 text-center">
                <PartyPopper className="size-8 text-success" />
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Alt er levert!</h2>
                  <p className="text-sm text-muted-foreground">
                    Alle {formatNumber(total)} bidrag er krysset av som levert.
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                Ingenting er levert ennå.
              </p>
            )
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.category?.id ?? "none"} className="space-y-3">
                  {categories.length > 0 && (
                    <h2 className="px-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                      {group.category?.name ?? "Uten kategori"}
                    </h2>
                  )}
                  <ul className="space-y-3">
                    {group.items.map(({ item, rows }) => (
                      <li key={item.id}>
                        <DeliveryItemCard item={item} rows={rows} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Summary({ delivered, total, remaining }: { delivered: number; total: number; remaining: number }) {
  const done = remaining === 0;
  return (
    <section
      aria-label="Status for levering"
      className={cn("rounded-2xl p-5 ring-1", done ? "bg-success-muted ring-success/20" : "bg-card ring-foreground/10")}
    >
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn("text-4xl font-bold tabular-nums", done && "text-success")}>
          {formatNumber(delivered)}
          <span className="text-2xl font-semibold text-muted-foreground"> av {formatNumber(total)}</span>
        </span>
        <span className="text-lg font-medium">bidrag levert</span>
      </p>
      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={delivered}
        aria-label={`${delivered} av ${total} bidrag levert`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", done ? "bg-success" : "bg-primary")}
          style={{ width: `${percent(delivered, total)}%` }}
        />
      </div>
      <p className={cn("mt-2 text-sm font-medium", done ? "text-success" : "text-foreground")}>
        {done ? (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-4" /> Alt er levert
          </span>
        ) : (
          `${formatNumber(remaining)} mangler`
        )}
      </p>
    </section>
  );
}

function DeliveryItemCard({ item, rows }: { item: AdminItem; rows: ContributionWithSignup[] }) {
  const signedUp = item.contributions.reduce((sum, c) => sum + c.quantity, 0);
  const deliveredQty = item.contributions.reduce((sum, c) => sum + (c.delivered_at ? c.quantity : 0), 0);
  const complete = signedUp > 0 && deliveredQty >= signedUp;

  return (
    <article className={cn("rounded-2xl bg-card ring-1", complete ? "ring-success/30" : "ring-foreground/10")}>
      <div className="space-y-2 px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h3 className="font-semibold leading-snug">{item.name}</h3>
          <p className={cn("inline-flex items-center gap-1 text-sm tabular-nums", complete ? "font-medium text-success" : "text-muted-foreground")}>
            {complete && <CheckCircle2 className="size-4" />}
            Levert{" "}
            <span className={cn("font-medium", !complete && "text-foreground")}>{formatNumber(deliveredQty)}</span> av{" "}
            {formatNumber(signedUp)} {item.unit}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className={cn("h-full rounded-full transition-all duration-500", complete ? "bg-success" : "bg-primary")}
            style={{ width: `${percent(deliveredQty, signedUp)}%` }}
          />
        </div>
      </div>
      <ul className="divide-y border-t">
        {rows.map((c) => (
          <DeliveryRow key={c.id} contribution={c} unit={item.unit} />
        ))}
      </ul>
    </article>
  );
}

function DeliveryRow({ contribution: c, unit }: { contribution: ContributionWithSignup; unit: string }) {
  const delivered = Boolean(c.delivered_at);
  const name = c.signup.contributor_name;

  // Ticked rows can vanish from the "Mangler" filter, so offer a quick undo.
  const onToggled = (nowDelivered: boolean) => {
    if (!nowDelivered) return;
    toast.success(`${name} er markert som levert`, {
      action: {
        label: "Angre",
        onClick: async () => {
          const result = await setDelivered(c.id, false);
          if (!result.ok) toast.error(result.error);
        },
      },
    });
  };

  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", delivered && "bg-success-muted/40")}>
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">
          {name}
          <span className="ml-2 font-semibold whitespace-nowrap text-primary tabular-nums">
            {formatNumber(c.quantity)} {unit}
          </span>
        </p>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          {c.signup.contributor_phone && (
            <a
              href={`tel:${c.signup.contributor_phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1 py-0.5 underline-offset-2 hover:text-foreground hover:underline"
              aria-label={`Ring ${name}, ${c.signup.contributor_phone}`}
            >
              <Phone className="size-3.5" /> {c.signup.contributor_phone}
            </a>
          )}
          {c.signup.source === "manual" && <span className="py-0.5">Lagt inn manuelt</span>}
          {c.delivered_at && (
            <span className="inline-flex items-center gap-1 py-0.5 text-success">
              <PackageCheck className="size-3.5" /> Levert {formatDateTime(c.delivered_at)}
            </span>
          )}
        </div>
      </div>
      <DeliveredToggle contributionId={c.id} delivered={delivered} alwaysShowLabel onToggled={onToggled} className="h-11" />
    </li>
  );
}
