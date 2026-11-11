import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicFooter } from "@/components/public/public-footer";
import { getPublicEvent } from "@/server/public-signups";
import { formatEventDate } from "@/lib/format";
import { PublicEventView } from "./public-event-view";

export async function generateMetadata({ params }: PageProps<"/a/[token]">): Promise<Metadata> {
  const { token } = await params;
  const event = await getPublicEvent(token);
  if (!event) return { title: "Fant ikke arrangementet", robots: { index: false, follow: false } };

  const date = formatEventDate(event.event_date);
  const description = `${event.organization_name}${date ? ` · ${date}` : ""}. Se hva som trengs og meld deg på uten innlogging.`;
  return {
    title: event.title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: `${event.title} – hvem tar med hva?`, description },
  };
}

export default function PublicEventPage({ params }: PageProps<"/a/[token]">) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-36 sm:pt-10">
        <Suspense fallback={<PublicEventSkeleton />}>
          <PublicEventLoader params={params} />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

async function PublicEventLoader({ params }: { params: PageProps<"/a/[token]">["params"] }) {
  const { token } = await params;
  const event = await getPublicEvent(token);
  if (!event) notFound();
  return <PublicEventView event={event} />;
}

function PublicEventSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Laster bidragslisten">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}
