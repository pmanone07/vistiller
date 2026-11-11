import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrganizations } from "@/lib/auth";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Nytt arrangement" };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Arrangementer
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nytt arrangement</h1>
        <p className="text-muted-foreground">Etterpå legger du inn hva dere trenger, og deler lenken.</p>
      </div>
      <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <Suspense fallback={<FormSkeleton />}>
          <NewEventForm />
        </Suspense>
      </div>
    </div>
  );
}

async function NewEventForm() {
  const organizations = await getOrganizations();
  if (organizations.length === 0) redirect("/dashboard");
  return <EventForm organizations={organizations.map(({ id, name }) => ({ id, name }))} />;
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
