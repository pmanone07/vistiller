import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { PublicFooter } from "@/components/public/public-footer";
import { getOwnSignup } from "@/server/public-signups";
import { SignupManager } from "./signup-manager";

export const metadata: Metadata = {
  title: "Ditt bidrag",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SignupPage({ params, searchParams }: PageProps<"/b/[editToken]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-36 sm:pt-10">
        <Suspense fallback={<SignupSkeleton />}>
          <SignupLoader params={params} searchParams={searchParams} />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

async function SignupLoader({
  params,
  searchParams,
}: Pick<PageProps<"/b/[editToken]">, "params" | "searchParams">) {
  const [{ editToken }, query] = await Promise.all([params, searchParams]);
  const data = await getOwnSignup(editToken);
  if (!data) return <SignupNotFound />;
  if (!data.event) notFound();
  return <SignupManager editToken={editToken} data={data} justCreated={query.ny === "1"} />;
}

function SignupNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Fant ikke påmeldingen</h1>
      <p className="max-w-sm text-muted-foreground">
        Påmeldingen kan være avbestilt, eller lenken er ufullstendig. Sjekk at du har kopiert hele lenken.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        Til forsiden
      </Link>
    </div>
  );
}

function SignupSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Laster påmeldingen">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
