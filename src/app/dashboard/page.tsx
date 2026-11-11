import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, CalendarPlus, ChevronRight, Lock, Plus, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InstallPrompt } from "@/components/install-prompt";
import { getOrganizations, requireUser } from "@/lib/auth";
import { formatEventDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getEventSummaries, type EventSummary } from "@/server/dashboard";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Arrangementer" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardHome />
    </Suspense>
  );
}

async function DashboardHome() {
  const [{ user }, organizations] = await Promise.all([requireUser(), getOrganizations()]);

  if (organizations.length === 0) {
    const suggested = typeof user.user_metadata?.organization_name === "string" ? user.user_metadata.organization_name : "";
    return <Onboarding defaultName={suggested} />;
  }

  const events = await getEventSummaries();
  const multipleOrgs = organizations.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{multipleOrgs ? "Dine korps" : organizations[0].name}</p>
          <h1 className="text-2xl font-bold tracking-tight">Arrangementer</h1>
        </div>
        <Link href="/dashboard/events/new" className={cn(buttonVariants({ size: "lg" }), "hidden sm:inline-flex")}>
          <Plus /> Nytt arrangement
        </Link>
      </div>

      <InstallPrompt />

      {events.length === 0 ? (
        <EmptyEvents />
      ) : multipleOrgs ? (
        organizations.map((org) => {
          const own = events.filter((e) => e.organization_id === org.id);
          return (
            <section key={org.id} className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{org.name}</h2>
              {own.length ? <EventList events={own} /> : <p className="text-sm text-muted-foreground">Ingen arrangementer ennå.</p>}
            </section>
          );
        })
      ) : (
        <EventList events={events} />
      )}

      <Link
        href="/dashboard/events/new"
        className={cn(buttonVariants({ size: "xl" }), "w-full sm:hidden")}
      >
        <Plus /> Nytt arrangement
      </Link>
    </div>
  );
}

function EventList({ events }: { events: EventSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  const date = formatEventDate(event.event_date, "short");
  const complete = event.itemCount > 0 && event.coverage >= 100;

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="group block rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:shadow-md hover:ring-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{event.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" /> {date}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {event.signupCount} påmeldt
            </span>
            {event.status === "closed" && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3.5" /> Stengt
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      {event.itemCount === 0 ? (
        <p className="mt-4 text-sm font-medium text-primary">Legg til bidrag →</p>
      ) : (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {event.completeCount} av {event.itemCount} bidrag dekket
            </span>
            <span className={cn("font-semibold tabular-nums", complete ? "text-success" : "text-foreground")}>
              {event.coverage}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", complete ? "bg-success" : "bg-primary")}
              style={{ width: `${event.coverage}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

function EmptyEvents() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed bg-card/50 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-muted">
        <CalendarPlus className="size-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Lag ditt første arrangement</h2>
        <p className="max-w-sm text-muted-foreground">
          Loppemarked, konsert eller 17. mai-kiosk? Legg inn hva dere trenger, og del lenken med foreldrene.
        </p>
      </div>
      <Link href="/dashboard/events/new" className={buttonVariants({ size: "xl" })}>
        <Plus /> Nytt arrangement
      </Link>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Laster">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
