"use client";

import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * Shown when the list could not be loaded because of a server or database
 * problem. Deliberately different from not-found: the link itself is fine, so
 * the parent should retry rather than ask the organizer for a new link.
 */
export default function PublicEventError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server errors arrive with a generic message and an id that matches the server log.
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <LogoMark className="size-10" />
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <CloudOff className="size-7 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold">Bidragslisten er midlertidig utilgjengelig</h1>
      <p className="text-muted-foreground">
        Lenken din er riktig, men vi klarte ikke å hente listen akkurat nå. Feilen ligger hos oss. Prøv igjen om litt.
      </p>
      <Button size="lg" onClick={() => retry()}>
        Prøv igjen
      </Button>
      {digest && <p className="text-xs text-muted-foreground">Feilkode: {digest}</p>}
    </main>
  );
}
