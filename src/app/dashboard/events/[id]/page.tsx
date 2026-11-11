import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_URL } from "@/lib/env";
import { getEventDetail } from "@/server/dashboard";
import { EventAdmin } from "./event-admin";

export const metadata: Metadata = { title: "Administrer arrangement" };

export default function EventAdminPage({ params, searchParams }: PageProps<"/dashboard/events/[id]">) {
  return (
    <Suspense fallback={<EventAdminSkeleton />}>
      <EventAdminLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EventAdminLoader({
  params,
  searchParams,
}: Pick<PageProps<"/dashboard/events/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getEventDetail(id);
  return (
    <EventAdmin
      detail={detail}
      shareUrl={`${SITE_URL}/a/${detail.event.public_token}`}
      justCreated={query.ny === "1"}
    />
  );
}

function EventAdminSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Laster arrangementet">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}
