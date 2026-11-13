"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Download, MessageSquareText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/copy-button";
import { copyText } from "@/lib/clipboard";
import { formatEventDate } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  eventDate: string | null;
}

/** Link + ready-made message + QR code for posters. */
export function ShareDialog({ open, onOpenChange, url, title, eventDate }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  const date = formatEventDate(eventDate);
  const message = `Hei! Til ${title}${date ? ` (${date.toLowerCase()})` : ""} trenger vi at flere stiller opp. Se hva som mangler og meld deg på her – det tar under ett minutt, og du trenger ingen konto:\n${url}`;

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0f2e2b", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, url]);

  async function share() {
    try {
      await navigator.share({ title, text: message.replace(`\n${url}`, ""), url });
    } catch {
      // User cancelled – nothing to do.
    }
  }

  async function copyMessage() {
    if (await copyText(message)) {
      toast.success("Meldingen er kopiert. Lim den inn i gruppechatten, i en e-post eller på SMS.");
    } else {
      toast.error("Kunne ikke kopiere meldingen.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Del arrangementet</DialogTitle>
          <DialogDescription>
            Alle med lenken kan se listen og melde seg på. Den er ikke søkbar på Google.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Delingslenke" className="font-mono text-sm" />
            <CopyButton value={url} size="lg" className="h-11 shrink-0" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" size="lg" onClick={copyMessage}>
              <MessageSquareText /> Kopier melding
            </Button>
            {canShare && (
              <Button variant="outline" size="lg" onClick={share}>
                <Share2 /> Del …
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            «Kopier melding» gir deg en ferdig tekst med lenken, klar til å limes inn der dere vanligvis snakker sammen.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted/60 p-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL generated in the browser
            <img src={qr} alt={`QR-kode til ${title}`} className="size-48 rounded-xl bg-white p-2" />
          ) : (
            <div className="size-48 animate-pulse rounded-xl bg-muted" />
          )}
          <p className="text-center text-xs text-muted-foreground">Heng opp QR-koden på oppslagstavla eller vis den på et møte.</p>
          {qr && (
            <a
              href={qr}
              download={`vistiller-${title.toLowerCase().replace(/[^a-z0-9æøå]+/gi, "-")}.png`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Download className="size-4" /> Last ned QR-kode
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
