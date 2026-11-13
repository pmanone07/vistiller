"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ItemProgress } from "@/components/item-progress";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatTimeRange, kindInfo } from "@/lib/kinds";
import { cn } from "@/lib/utils";
import type { ContributionWithSignup } from "@/lib/types";
import type { AdminItem } from "@/server/dashboard";
import { addManualContribution, deleteContribution, deleteItem, moveItem } from "../../actions";
import { DeliveredToggle } from "./delivered-toggle";

interface Props {
  item: AdminItem;
  onEdit: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ItemAdminCard({ item, onEdit, isFirst, isLast }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();
  const complete = item.allocated >= item.target_quantity;
  const count = item.contributions.length;
  const deliveredCount = item.contributions.filter((c) => c.delivered_at).length;
  const kind = kindInfo(item.kind);
  const KindIcon = kind.icon;
  const time = formatTimeRange(item.starts_at, item.ends_at);
  const done = kind.done.toLowerCase();

  const move = (direction: "up" | "down") =>
    startTransition(async () => {
      const result = await moveItem(item.id, direction);
      if (!result.ok) toast.error(result.error);
    });

  return (
    <article
      className={cn(
        "rounded-2xl bg-card ring-1 transition-shadow",
        complete ? "ring-success/30" : "ring-foreground/10",
        expanded && "shadow-md",
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <KindIcon className="size-3.5" /> {kind.tag}
              </span>
              {time && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-2 py-0.5 text-primary tabular-nums">
                  <Clock className="size-3.5" /> {time}
                </span>
              )}
            </p>
            <h3 className="font-semibold leading-snug">
              {item.name}
              {item.allow_extra && (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-xs font-normal text-muted-foreground">
                  ekstra tillatt
                </span>
              )}
            </h3>
            {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-lg" aria-label={`Valg for ${item.name}`} />}
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil /> Rediger
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => move("up")} disabled={isFirst}>
                <ArrowUp /> Flytt opp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => move("down")} disabled={isLast}>
                <ArrowDown /> Flytt ned
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Slett
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ItemProgress className="mt-3" allocated={item.allocated} target={item.target_quantity} unit={item.unit} />

        {/* The label wraps onto a second line on narrow screens; the chevron stays on the right. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
        >
          <span className="min-w-0">
            {count === 0 ? "Ingen påmeldte ennå" : `${count} påmeldt – kryss av som ${done}`}
            {deliveredCount > 0 && <span className="ml-2 whitespace-nowrap text-success">· {deliveredCount} {done}</span>}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="border-t px-4 pt-2 pb-4">
          {count > 0 && (
            <ul className="divide-y">
              {item.contributions.map((c) => (
                <ContributionRow key={c.id} contribution={c} unit={item.unit} doneLabel={kind.done} />
              ))}
            </ul>
          )}
          <ManualAddForm itemId={item.id} unit={item.unit} />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Slette «${item.name}»?`}
        description={
          count > 0
            ? `${count} påmelding${count === 1 ? "" : "er"} til dette blir også slettet. Dette kan ikke angres.`
            : "Dette kan ikke angres."
        }
        onConfirm={async () => {
          const result = await deleteItem(item.id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success(`${item.name} er slettet`);
        }}
      />
    </article>
  );
}

function ContributionRow({
  contribution: c,
  unit,
  doneLabel,
}: {
  contribution: ContributionWithSignup;
  unit: string;
  doneLabel: string;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const delivered = Boolean(c.delivered_at);

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {c.signup.contributor_name}
          <span className="ml-2 font-semibold text-primary tabular-nums">
            {formatNumber(c.quantity)} {unit}
          </span>
        </p>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          {c.signup.contributor_phone && (
            <a href={`tel:${c.signup.contributor_phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="size-3.5" /> {c.signup.contributor_phone}
            </a>
          )}
          {c.signup.contributor_email && (
            <a href={`mailto:${c.signup.contributor_email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-foreground">
              <Mail className="size-3.5 shrink-0" /> <span className="truncate">{c.signup.contributor_email}</span>
            </a>
          )}
          {c.signup.source === "manual" && <span>Lagt inn manuelt</span>}
          {delivered && c.delivered_at && <span className="text-success">{doneLabel} {formatDateTime(c.delivered_at)}</span>}
        </div>
      </div>
      <DeliveredToggle contributionId={c.id} delivered={delivered} doneLabel={doneLabel} />
      <Button variant="ghost" size="icon-lg" onClick={() => setConfirmRemove(true)} aria-label={`Fjern ${c.signup.contributor_name}`}>
        <Trash2 className="text-muted-foreground" />
      </Button>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Fjerne ${c.signup.contributor_name}?`}
        description={`${formatNumber(c.quantity)} ${unit} blir frigjort, slik at andre kan melde seg på.`}
        confirmLabel="Fjern"
        onConfirm={async () => {
          const result = await deleteContribution(c.id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
        }}
      />
    </li>
  );
}

function ManualAddForm({ itemId, unit }: { itemId: string; unit: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="ghost" size="lg" className="mt-2 text-primary" onClick={() => setOpen(true)}>
        <UserPlus /> Legg til manuelt
      </Button>
    );
  }

  return (
    <form
      className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await addManualContribution(itemId, { name, quantity, phone });
          if (!result.ok) return void toast.error(result.error);
          toast.success(`${name} er lagt til`);
          setName("");
          setQuantity("1");
          setPhone("");
          setOpen(false);
        });
      }}
    >
      <p className="text-sm font-medium">Legg til noen som har meldt seg på utenom lenken</p>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn" maxLength={80} required autoFocus aria-label="Navn" />
        <div className="relative">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            aria-label={`Antall ${unit}`}
            className="pr-10"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobil (valgfritt)" type="tel" maxLength={30} aria-label="Mobil" />
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Legg til
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
