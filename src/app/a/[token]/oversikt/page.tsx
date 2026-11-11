import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AutoRefresh } from "@/components/public/auto-refresh";
import { PublicFooter } from "@/components/public/public-footer";
import { getPublicEvent } from "@/server/public-signups";
import { EventOverview } from "./event-overview";

export async function generateMetadata({ params }: PageProps<"/a/[token]/oversikt">): Promise<Metadata> {
  const { token } = await params;
  const event = await getPublicEvent(token);
  return {
    title: event ? `${event.title} – oversikt` : "Fant ikke arrangementet",
    robots: { index: false, follow: false },
  };
}

/** Read-only status of the list: what is registered, delivered and still missing. */
export default function EventOverviewPage({ params }: PageProps<"/a/[token]/oversikt">) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-12 sm:pt-10">
        <Suspense fallback={<OverviewSkeleton />}>
          <OverviewLoader params={params} />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

async function OverviewLoader({ params }: { params: PageProps<"/a/[token]/oversikt">["params"] }) {
  const { token } = await params;
  const event = await getPublicEvent(token);
  if (!event) notFound();
  return (
    <>
      <AutoRefresh />
      <EventOverview event={event} />
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Laster oversikten">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
