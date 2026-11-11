import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatEventDate, overallCoverage } from "@/lib/format";
import type { PublicEvent } from "@/lib/types";

/** Title card at the top of the public list and the edit page. */
export function EventHeader({ event, compact = false }: { event: PublicEvent; compact?: boolean }) {
  const date = formatEventDate(event.event_date);
  const coverage = overallCoverage(event.items);
  const doneCount = event.items.filter((i) => i.allocated >= i.target_quantity).length;

  return (
    <header className="space-y-3">
      <p className="text-sm font-medium text-primary">{event.organization_name}</p>
      <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{event.title}</h1>
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
        {date && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {date}
          </span>
        )}
        {event.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" />
            {event.location}
          </span>
        )}
        {event.contributor_count > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" />
            {event.contributor_count} har meldt seg på
          </span>
        )}
      </div>
      {!compact && event.description && (
        <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-foreground/85">
          {event.description}
        </p>
      )}
      {!compact && event.items.length > 0 && (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">
              {doneCount} av {event.items.length} bidrag er dekket
            </span>
            <span className="text-2xl font-bold tabular-nums text-primary">{coverage}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={coverage >= 100 ? "h-full bg-success" : "h-full bg-primary"}
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
