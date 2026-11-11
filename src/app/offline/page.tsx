import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Ingen nettilkobling" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <LogoMark className="size-12" />
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Ingen nettilkobling</h1>
      <p className="text-muted-foreground">
        Korpsfix trenger internett for å vise oppdaterte lister. Sjekk tilkoblingen og prøv igjen.
      </p>
    </main>
  );
}
