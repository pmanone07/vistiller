import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventDetail } from "@/server/dashboard";
import { DeliveryOverview } from "./delivery-overview";

export const metadata: Metadata = { title: "Avkrysning" };

export default function DeliveryPage({ params }: PageProps<"/dashboard/events/[id]/delivery">) {
  return (
    <Suspense fallback={<DeliverySkeleton />}>
      <DeliveryLoader params={params} />
    </Suspense>
  );
}

async function DeliveryLoader({ params }: Pick<PageProps<"/dashboard/events/[id]/delivery">, "params">) {
  const { id } = await params;
  const detail = await getEventDetail(id);
  return <DeliveryOverview detail={detail} />;
}

function DeliverySkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-busy="true" aria-label="Laster avkrysningslisten">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-10 rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}
