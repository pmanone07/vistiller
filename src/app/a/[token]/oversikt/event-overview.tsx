import Link from "next/link";
import { CheckCircle2, HandHeart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EventHeader } from "@/components/public/event-header";
import { formatNumber } from "@/lib/format";
import { groupItems } from "@/lib/group";
import { doneLabel } from "@/lib/kinds";
import { cn } from "@/lib/utils";
import type { PublicEvent, PublicItem } from "@/lib/types";

/**
 * Read-only status of an event: per item, how much is registered, how much has
 * been delivered and how much is still missing. No sign-up controls.
 */
export function EventOverview({ event }: { event: PublicEvent }) {
  const groups = groupItems(event.items, event.categories);
  // `delivered` is absent until the database migration that adds it has run.
  const showDelivered = event.items.some((i) => i.delivered !== undefined);
  const total = event.items.length;
  const covered = event.items.filter((i) => i.allocated >= i.target_quantity).length;
  const missing = total - covered;
  const deliveredCount = event.items.filter((i) => (i.delivered ?? 0) >= i.target_quantity).length;
  const canSignUp = event.status === "open" && missing > 0;

  return (
    <div className="space-y-6">
      <EventHeader event={event} compact />

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          Arrangøren har ikke lagt inn noe i listen ennå.
        </div>
      ) : (
        <>
          <dl
            className={cn(
              "grid gap-2 rounded-2xl bg-card p-4 text-center ring-1 ring-foreground/10",
              showDelivered ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            <SummaryStat label="Dekket" value={covered} total={total} />
            {showDelivered && <SummaryStat label="Krysset av" value={deliveredCount} total={total} />}
            <SummaryStat label="Mangler" value={missing} total={total} />
          </dl>

          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.category?.id ?? "none"} className="space-y-3">
                {group.category && (
                  <h2 className="px-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.category.name}
                  </h2>
                )}
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <OverviewItem item={item} showDelivered={showDelivered} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {canSignUp && (
        <Link href={`/a/${event.token}`} className={cn(buttonVariants({ variant: "outline", size: "xl" }), "w-full")}>
          <HandHeart /> Meld på bidrag
        </Link>
      )}
    </div>
  );
}

function SummaryStat({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground"> av {total}</span>
      </dd>
    </div>
  );
}

function OverviewItem({ item, showDelivered }: { item: PublicItem; showDelivered: boolean }) {
  const target = item.target_quantity;
  const delivered = item.delivered ?? 0;
  const remaining = Math.max(target - item.allocated, 0);
  const complete = remaining === 0;
  const pct = (n: number) => Math.min(100, Math.max(0, (n / target) * 100));
  const registeredPct = pct(item.allocated);
  const deliveredPct = Math.min(pct(delivered), registeredPct);

  return (
    <article
      className={cn(
        "rounded-2xl bg-card p-4 ring-1",
        complete ? "bg-success-muted/60 ring-success/25" : "ring-foreground/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug">{item.name}</h3>
          {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
        </div>
        {complete && (
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" /> Dekket
          </span>
        )}
      </div>

      {/* Registered so far; with delivery data, the delivered part is filled in on top. */}
      <div
        className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(item.allocated, target)}
        aria-label={`${item.allocated} av ${target} ${item.unit} registrert`}
      >
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", showDelivered ? "bg-primary/35" : "bg-primary")}
          style={{ width: `${registeredPct}%` }}
        />
        {showDelivered && (
          <div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${deliveredPct}%` }} />
        )}
      </div>

      <dl className={cn("mt-3 grid gap-2 text-sm", showDelivered ? "grid-cols-3" : "grid-cols-2")}>
        <Figure label="Registrert" value={item.allocated} suffix={`av ${formatNumber(target)} ${item.unit}`} />
        {showDelivered && <Figure label={doneLabel(item.kind)} value={delivered} suffix={item.unit} tone="success" />}
        <Figure
          label="Mangler"
          value={remaining}
          suffix={item.unit}
          tone={remaining > 0 ? "default" : "muted"}
          align="end"
        />
      </dl>
    </article>
  );
}

function Figure({
  label,
  value,
  suffix,
  tone = "default",
  align = "start",
}: {
  label: string;
  value: number;
  suffix: string;
  tone?: "default" | "success" | "muted";
  align?: "start" | "end";
}) {
  return (
    <div className={cn("flex flex-col-reverse", align === "end" && "items-end text-right")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums text-muted-foreground">
        <span
          className={cn(
            "text-base font-semibold",
            tone === "success" ? "text-success" : tone === "muted" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {formatNumber(value)}
        </span>{" "}
        {suffix}
      </dd>
    </div>
  );
}
