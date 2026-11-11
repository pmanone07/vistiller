"use client";

import { useState } from "react";
import { Check, CheckCircle2, HandHeart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemProgress } from "@/components/item-progress";
import { QuantityPicker } from "@/components/quantity-picker";
import { groupItems } from "@/lib/group";
import { cn } from "@/lib/utils";
import type { PublicEvent, PublicItem } from "@/lib/types";

export type Selection = Record<string, number>;

interface Props {
  event: PublicEvent;
  selection: Selection;
  onChange: (itemId: string, quantity: number) => void;
  /** Quantities the person already holds (edit mode). Excluded from "allocated by others". */
  held?: Selection;
  /** Item ids that can't be changed (already delivered). */
  locked?: Set<string>;
  disabled?: boolean;
  onlyMissing?: boolean;
}

export function ItemChooser({ event, selection, onChange, held = {}, locked, disabled, onlyMissing }: Props) {
  const visible = onlyMissing
    ? event.items.filter(
        (i) => (selection[i.id] ?? 0) > 0 || (held[i.id] ?? 0) > 0 || i.allocated < i.target_quantity,
      )
    : event.items;
  const groups = groupItems(visible, event.categories);

  if (event.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        Arrangøren har ikke lagt inn noen bidrag ennå.
      </div>
    );
  }
  if (visible.length === 0) {
    return (
      <div className="rounded-2xl bg-success-muted p-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 size-8 text-success" />
        <p className="font-semibold">Alt er dekket!</p>
        <p className="text-sm text-muted-foreground">Takk til alle som bidrar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.category?.id ?? "none"} className="space-y-3">
          {group.category && (
            <h2 className="px-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {group.category.name}
            </h2>
          )}
          <ul className="space-y-3">
            {group.items.map((item) => (
              <li key={item.id}>
                <ItemCard
                  item={item}
                  quantity={selection[item.id] ?? 0}
                  held={held[item.id] ?? 0}
                  locked={locked?.has(item.id) ?? false}
                  disabled={disabled}
                  onChange={(q) => onChange(item.id, q)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ItemCard({
  item,
  quantity,
  held,
  locked,
  disabled,
  onChange,
}: {
  item: PublicItem;
  quantity: number;
  held: number;
  locked: boolean;
  disabled?: boolean;
  onChange: (q: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const others = Math.max(item.allocated - held, 0);
  const remainingForMe = Math.max(item.target_quantity - others, 0);
  const max = item.allow_extra ? null : remainingForMe;
  const fullByOthers = !item.allow_extra && remainingForMe === 0;
  const selected = quantity > 0;
  const expanded = open && !locked && !disabled;

  return (
    <article
      className={cn(
        "rounded-2xl bg-card p-4 ring-1 transition-all",
        selected ? "ring-2 ring-primary shadow-md shadow-primary/10" : "ring-foreground/10",
        fullByOthers && !selected && "bg-success-muted/60 ring-success/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug">{item.name}</h3>
          {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
        </div>
        {selected && !expanded && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground">
            <Check className="size-3.5" />
            {quantity} {item.unit}
          </span>
        )}
      </div>

      <ItemProgress
        className="mt-3"
        allocated={others}
        target={item.target_quantity}
        unit={item.unit}
        pending={quantity}
      />

      {max !== null && quantity > max && !locked && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {max === 0
            ? "Noen har akkurat dekket dette. Fjern det fra valgene dine."
            : `Det er bare ${max} ${item.unit} igjen nå. Juster antallet.`}
        </p>
      )}

      {locked ? (
        <p className="mt-3 text-sm font-medium text-success">Levert – takk!</p>
      ) : expanded ? (
        <div className="mt-4 space-y-3 border-t pt-4">
          <QuantityPicker value={quantity} onChange={onChange} max={max} unit={item.unit} label={item.name} />
          <div className="flex gap-2">
            <Button type="button" size="lg" className="flex-1" onClick={() => setOpen(false)}>
              {selected ? "Ferdig" : "Lukk"}
            </Button>
            {selected && (
              <Button
                type="button"
                size="lg"
                variant="destructive"
                className="border-destructive/70 bg-transparent hover:bg-destructive/10 dark:border-destructive/70 dark:bg-transparent dark:hover:bg-destructive/20"
                onClick={() => {
                  onChange(0);
                  setOpen(false);
                }}
              >
                <Trash2 /> Fjern
              </Button>
            )}
          </div>
        </div>
      ) : fullByOthers && !selected ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" /> Dette er dekket – takk!
        </p>
      ) : disabled ? null : (
        <div className="mt-4">
          <Button
            type="button"
            size="xl"
            variant={selected ? "outline" : "default"}
            className="w-full"
            onClick={() => {
              if (!selected) onChange(1);
              setOpen(true);
            }}
          >
            {selected ? (
              "Endre antall"
            ) : (
              <>
                <HandHeart /> Jeg tar med
              </>
            )}
          </Button>
        </div>
      )}
    </article>
  );
}
