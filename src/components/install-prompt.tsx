"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "vistiller:install-dismissed";

/** Shows "Installer ViStiller" when the browser supports PWA install. */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // ignore
    }
    if (dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!event) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setEvent(null);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-brand-muted p-3 pl-4">
      <Download className="size-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm">
        <span className="font-semibold">Installer ViStiller</span> på hjemskjermen for rask tilgang.
      </p>
      <Button
        size="lg"
        onClick={async () => {
          await event.prompt();
          await event.userChoice;
          setEvent(null);
        }}
      >
        Installer
      </Button>
      <Button variant="ghost" size="icon-lg" onClick={dismiss} aria-label="Ikke nå">
        <X />
      </Button>
    </div>
  );
}
