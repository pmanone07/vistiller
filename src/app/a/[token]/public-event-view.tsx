"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ChevronRight, Loader2, Lock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventHeader } from "@/components/public/event-header";
import { ItemChooser, type Selection } from "@/components/public/item-chooser";
import { ContactFields, type ContactValue } from "@/components/public/contact-fields";
import { useAutoRefresh } from "@/components/public/use-auto-refresh";
import { rememberSignup, signupsForEvent, type RememberedSignup } from "@/lib/my-signups";
import { formatNumber } from "@/lib/format";
import type { PublicEvent } from "@/lib/types";
import { submitSignup } from "./actions";

export function PublicEventView({ event }: { event: PublicEvent }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>({});
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contact, setContact] = useState<ContactValue>({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [pending, startTransition] = useTransition();
  const [mine, setMine] = useState<RememberedSignup[]>([]);

  const isOpen = event.status === "open";
  useAutoRefresh(20000, !dialogOpen && !pending);

  // Device-local conveniences (only available after hydration).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after mount
    setMine(signupsForEvent(event.token));
  }, [event.token]);

  const chosen = useMemo(
    () =>
      event.items
        .filter((i) => (selection[i.id] ?? 0) > 0)
        .map((i) => ({ item: i, quantity: selection[i.id] })),
    [event.items, selection],
  );

  function setQuantity(itemId: string, quantity: number) {
    setSelection((prev) => {
      const next = { ...prev };
      if (quantity > 0) next[itemId] = quantity;
      else delete next[itemId];
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await submitSignup(event.token, {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        website: honeypot,
        items: chosen.map((c) => ({ item_id: c.item.id, quantity: c.quantity })),
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        router.refresh(); // fetch the latest numbers so the person can adjust
        return;
      }

      rememberSignup({ eventToken: event.token, editToken: result.data.editToken, name: contact.name });
      router.push(`/b/${result.data.editToken}?ny=1`);
    });
  }

  return (
    <div className="space-y-6">
      <EventHeader event={event} />

      {mine.length > 0 && (
        <div className="space-y-2">
          {mine.map((s) => (
            <Link
              key={s.editToken}
              href={`/b/${s.editToken}`}
              className="flex items-center gap-3 rounded-2xl bg-brand-muted p-4 text-sm transition-colors hover:bg-secondary"
            >
              <UserCheck className="size-5 shrink-0 text-primary" />
              <span className="flex-1">
                <span className="font-semibold">Du er påmeldt</span> som {s.name}. Se eller endre det du har meldt deg på.
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {!isOpen && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm">
          <Lock className="size-5 shrink-0 text-muted-foreground" />
          <span>Påmeldingen er stengt. Kontakt arrangøren hvis du lurer på noe.</span>
        </div>
      )}

      {event.items.length > 0 && (
        <label className="flex items-center justify-between gap-3 px-1 text-sm">
          <span className="font-medium">Vis bare det som mangler</span>
          <Switch checked={onlyMissing} onCheckedChange={setOnlyMissing} />
        </label>
      )}

      <ItemChooser
        event={event}
        selection={selection}
        onChange={setQuantity}
        disabled={!isOpen}
        onlyMissing={onlyMissing}
      />

      {/* Sticky action bar */}
      {isOpen && chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur animate-in slide-in-from-bottom-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{chosen.length} valgt</p>
              <p className="truncate text-muted-foreground">
                {chosen.map((c) => `${formatNumber(c.quantity)} ${c.item.unit} ${c.item.name.toLowerCase()}`).join(", ")}
              </p>
            </div>
            <Button size="xl" onClick={() => setDialogOpen(true)}>
              Fortsett <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !pending && setDialogOpen(open)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Bekreft påmeldingen</DialogTitle>
            <DialogDescription>Du får en egen lenke der du kan endre eller avbestille senere.</DialogDescription>
          </DialogHeader>

          <ul className="divide-y rounded-xl bg-muted/60 px-3 text-sm">
            {chosen.map((c) => (
              <li key={c.item.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-medium">{c.item.name}</span>
                <span className="tabular-nums">
                  {formatNumber(c.quantity)} {c.item.unit}
                </span>
              </li>
            ))}
          </ul>

          <form onSubmit={submit} className="space-y-5">
            <ContactFields value={contact} onChange={setContact} errors={errors} autoFocus />
            {/* Honeypot: hidden from people, tempting for bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Nettside
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  name="website"
                />
              </label>
            </div>
            <Button type="submit" size="xl" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Lagrer …" : "Meld meg på"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
