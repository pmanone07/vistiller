import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicFooter } from "@/components/public/public-footer";
import { getPublicEvent, isValidToken } from "@/server/public-signups";
import { formatEventDate } from "@/lib/format";
import { InvalidLink } from "./invalid-link";
import { PublicEventView } from "./public-event-view";

export async function generateMetadata({ params }: PageProps<"/a/[token]">): Promise<Metadata> {
  const { token } = await params;
  // A failed lookup must not break the metadata: the page itself renders the
  // error (see error.tsx), so fall back to a neutral title here.
  const event = await getPublicEvent(token).catch(() => null);
  if (!event) return { title: "Bidragsliste", robots: { index: false, follow: false } };

  const date = formatEventDate(event.event_date);
  const description = `${event.organization_name}${date ? ` · ${date}` : ""}. Se hva som trengs, og meld deg på uten innlogging.`;
  return {
    title: event.title,
    description,
    robots: { index: false, follow: false },
    // A page-level openGraph replaces the root one, so the share image is repeated here.
    openGraph: { title: `${event.title} – bli med og bidra`, description, images: ["/opengraph-image.png"] },
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
  // Three distinct outcomes: malformed link, unknown/archived event (not-found.tsx)
  // and server/database failure (thrown, handled by error.tsx).
  if (!isValidToken(token)) return <InvalidLink />;
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
