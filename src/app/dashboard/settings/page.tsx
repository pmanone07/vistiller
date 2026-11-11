import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrganizations, requireUser } from "@/lib/auth";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Innstillinger" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Innstillinger</h1>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        }
      >
        <SettingsLoader />
      </Suspense>
    </div>
  );
}

async function SettingsLoader() {
  const [{ user }, organizations] = await Promise.all([requireUser(), getOrganizations()]);
  return <SettingsView email={user.email ?? ""} organizations={organizations} />;
}
