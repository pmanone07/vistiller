"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, CheckCircle2, Loader2, Lock, Pencil, PackageCheck, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventHeader } from "@/components/public/event-header";
import { ItemChooser, type Selection } from "@/components/public/item-chooser";
import { ContactFields, type ContactValue } from "@/components/public/contact-fields";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { forgetSignup, rememberSignup, saveContact } from "@/lib/my-signups";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OwnSignup } from "@/lib/types";
import { cancelSignupAction, saveSignupChanges } from "./actions";

interface Props {
  editToken: string;
  data: OwnSignup;
  justCreated: boolean;
}

export function SignupManager({ editToken, data, justCreated }: Props) {
  const router = useRouter();
  const { event, signup, contributions } = data;
  const [showThanks] = useState(justCreated);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [link, setLink] = useState(`/b/${editToken}`);

  const held = useMemo<Selection>(
    () => Object.fromEntries(contributions.map((c) => [c.item_id, c.quantity])),
    [contributions],
  );
  const delivered = useMemo(
    () => new Set(contributions.filter((c) => c.delivered_at).map((c) => c.item_id)),
    [contributions],
  );
  const [selection, setSelection] = useState<Selection>(held);
  const [contact, setContact] = useState<ContactValue>({
    name: signup.contributor_name,
    email: signup.contributor_email ?? "",
    phone: signup.contributor_phone ?? "",
  });

  const isOpen = event.status === "open";
  const itemsById = useMemo(() => new Map(event.items.map((i) => [i.id, i])), [event.items]);
  const anyDelivered = delivered.size > 0;

  useEffect(() => {
    // Remember on this device, show the full link, and drop "?ny=1" so a reload doesn't repeat the thank-you.
    rememberSignup({ eventToken: event.token, editToken, name: signup.contributor_name });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- origin is only known in the browser
    setLink(`${window.location.origin}/b/${editToken}`);
    if (window.location.search) window.history.replaceState(null, "", `/b/${editToken}`);
  }, [editToken, event.token, signup.contributor_name]);

  function startEditing() {
    setSelection(held);
    setErrors({});
    setEditing(true);
  }

  function setQuantity(itemId: string, quantity: number) {
    setSelection((prev) => {
      const next = { ...prev };
      if (quantity > 0) next[itemId] = quantity;
      else delete next[itemId];
      return next;
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveSignupChanges(editToken, {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        items: Object.entries(selection).map(([item_id, quantity]) => ({ item_id, quantity })),
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        router.refresh();
        return;
      }
      saveContact({ name: contact.name, email: contact.email, phone: contact.phone });
      toast.success("Endringene er lagret");
      setEditing(false);
      router.refresh();
    });
  }

  async function cancel() {
    const result = await cancelSignupAction(editToken);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    forgetSignup(editToken);
    toast.success("Påmeldingen er avbestilt");
    router.push(`/a/${event.token}`);
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-6">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon-lg" onClick={() => setEditing(false)} aria-label="Tilbake">
            <ArrowLeft />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{event.title}</p>
            <h1 className="text-xl font-bold">Endre bidraget ditt</h1>
          </div>
        </div>

        <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <ContactFields value={contact} onChange={setContact} errors={errors} />
        </section>

        <ItemChooser
          event={event}
          selection={selection}
          onChange={setQuantity}
          held={held}
          locked={delivered}
        />

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-3">
            <Button type="button" variant="outline" size="xl" onClick={() => setEditing(false)} disabled={pending}>
              Avbryt
            </Button>
            <Button type="submit" size="xl" className="flex-1" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Lagrer …" : "Lagre endringer"}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {showThanks && (
        <div className="rounded-3xl bg-success-muted p-6 text-center ring-1 ring-success/20 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success text-success-foreground">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="text-2xl font-bold">Tusen takk, {signup.contributor_name.split(" ")[0]}!</h1>
          <p className="mt-1 text-foreground/80">Bidraget ditt er registrert, og listen er oppdatert.</p>
        </div>
      )}

      <EventHeader event={event} compact />

      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">{showThanks ? "Du tar med" : `${signup.contributor_name} tar med`}</h2>
          {anyDelivered && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
              <PackageCheck className="size-4" /> Delvis levert
            </span>
          )}
        </div>
        <ul className="divide-y">
          {contributions.map((c) => {
            const item = itemsById.get(c.item_id);
            if (!item) return null;
            return (
              <li key={c.item_id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-medium">{item.name}</span>
                <span className="flex items-center gap-2">
                  {c.delivered_at && (
                    <span className="rounded-full bg-success-muted px-2 py-0.5 text-xs font-medium text-success">
                      Levert
                    </span>
                  )}
                  <span className="rounded-full bg-brand-muted px-3 py-1 text-sm font-semibold tabular-nums text-primary">
                    {formatNumber(c.quantity)} {item.unit}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-dashed border-primary/40 bg-brand-muted/50 p-4">
        <div className="flex gap-3">
          <Bookmark className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Ta vare på denne lenken</p>
            <p className="text-muted-foreground">
              Det er din private lenke for å endre eller avbestille. Den er også lagret på denne enheten.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Din private lenke" className="font-mono text-xs" />
          <CopyButton value={link} size="lg" variant="outline" className="h-11 shrink-0" />
        </div>
      </section>

      {!isOpen && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm">
          <Lock className="size-5 shrink-0 text-muted-foreground" />
          <span>Påmeldingen er stengt, så bidraget kan ikke endres. Kontakt arrangøren ved behov.</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {isOpen && (
          <Button size="xl" onClick={startEditing}>
            <Pencil /> Endre bidrag
          </Button>
        )}
        <Link
          href={`/a/${event.token}`}
          className={cn(buttonVariants({ variant: "outline", size: "xl" }), !isOpen && "sm:col-span-2")}
        >
          Se hele listen
        </Link>
      </div>

      {!anyDelivered && (
        <div className="text-center">
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmCancel(true)}>
            <Trash2 /> Avbestill påmeldingen
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Avbestille påmeldingen?"
        description="Alle bidragene dine fjernes fra listen, slik at andre kan ta dem. Dette kan ikke angres."
        confirmLabel="Ja, avbestill"
        cancelLabel="Nei, behold"
        onConfirm={cancel}
      />
    </div>
  );
}
