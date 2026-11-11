"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold">Noe gikk galt</h1>
      <p className="text-muted-foreground">
        Vi klarte ikke å laste siden. Sjekk nettforbindelsen og prøv igjen.
      </p>
      <Button size="lg" onClick={reset}>
        Prøv igjen
      </Button>
    </main>
  );
}
