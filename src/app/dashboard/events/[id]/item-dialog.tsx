"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ITEM_KINDS, ITEM_KIND_VALUES, formatTimeRange, itemKind, timeValue, type ItemKind } from "@/lib/kinds";
import type { Category, Item } from "@/lib/types";
import { createCategory, saveItem } from "../../actions";

/** Toggle-button look shared by the category and unit choosers. */
const chip = (selected: boolean) =>
  cn(
    "h-9 min-w-0 max-w-full rounded-lg border px-2.5 text-sm font-medium",
    selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
  );

interface FormState {
  kind: ItemKind;
  starts_at: string;
  ends_at: string;
  name: string;
  target_quantity: string;
  unit: string;
  category_id: string;
  description: string;
  allow_extra: boolean;
}

const empty = (categoryId = "", kind: ItemKind = "bring"): FormState => ({
  kind,
  starts_at: "",
  ends_at: "",
  name: "",
  target_quantity: "",
  unit: ITEM_KINDS[kind].defaultUnit,
  category_id: categoryId,
  description: "",
  allow_extra: false,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  categories: Category[];
  /** Edit this item; create a new one when null. */
  item: Item | null;
  defaultCategoryId?: string | null;
}

export function ItemDialog({ open, onOpenChange, eventId, categories, item, defaultCategoryId }: Props) {
  const [form, setForm] = useState<FormState>(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  // Inline "+ Ny kategori" creator. `newCategory` is null while closed.
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryPending, startCategoryTransition] = useTransition();
  // Categories created here whose refreshed `categories` prop hasn't arrived yet.
  const [created, setCreated] = useState<Category[]>([]);
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const focusCategoryRef = useRef<string | null>(null);
  const kind = ITEM_KINDS[form.kind];
  const UNITS = kind.units;
  const isCustomUnit = !UNITS.includes(form.unit);
  const countsPeople = form.unit === "personer";
  const shownCategories = [...categories, ...created.filter((c) => !categories.some((p) => p.id === c.id))];

  // Reset each time the dialog opens. `categories` is deliberately not a dependency:
  // creating a category refreshes the page props, and that must not wipe the form.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form each time the dialog opens
    setErrors({});
    setNewCategory(null);
    setCategoryError(null);
    setCreated([]);
    setForm(
      item
        ? {
            kind: itemKind(item.kind),
            starts_at: timeValue(item.starts_at),
            ends_at: timeValue(item.ends_at),
            name: item.name,
            target_quantity: String(item.target_quantity),
            unit: item.unit,
            category_id: item.category_id ?? "",
            description: item.description ?? "",
            allow_extra: item.allow_extra,
          }
        : empty(defaultCategoryId ?? ""),
    );
  }, [open, item, defaultCategoryId]);

  // Move focus after the creator opens/closes (its input mounts/unmounts).
  useEffect(() => {
    const target = focusCategoryRef.current;
    if (!target) return;
    focusCategoryRef.current = null;
    categorySectionRef.current?.querySelector<HTMLElement>(`[data-category-focus="${target}"]`)?.focus();
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Switching kind also switches to that kind's usual unit, unless a custom one was typed. */
  function chooseKind(next: ItemKind) {
    setForm((f) => {
      if (f.kind === next) return f;
      const keepUnit = !ITEM_KINDS[f.kind].units.includes(f.unit) || ITEM_KINDS[next].units.includes(f.unit);
      return { ...f, kind: next, unit: keepUnit ? f.unit : ITEM_KINDS[next].defaultUnit };
    });
  }

  function openNewCategory() {
    setCategoryError(null);
    setNewCategory("");
    focusCategoryRef.current = "input";
  }

  function cancelNewCategory() {
    if (categoryPending) return;
    setNewCategory(null);
    setCategoryError(null);
    focusCategoryRef.current = "new";
  }

  function addCategory() {
    if (newCategory === null || categoryPending) return;
    const name = newCategory.trim();
    if (!name) return setCategoryError("Skriv inn et navn.");
    // Same name as an existing category: just select it instead of creating a duplicate.
    const existing = shownCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      update("category_id", existing.id);
      setNewCategory(null);
      setCategoryError(null);
      focusCategoryRef.current = existing.id;
      return;
    }
    setCategoryError(null);
    startCategoryTransition(async () => {
      const result = await createCategory(eventId, name);
      if (!result.ok) {
        setCategoryError(result.error);
        toast.error(result.error);
        return;
      }
      const { id } = result.data;
      // Show and select it right away; the refreshed `categories` prop may arrive a moment later.
      setCreated((list) => [...list, { id, event_id: eventId, name, sort_order: Number.MAX_SAFE_INTEGER }]);
      update("category_id", id);
      setNewCategory(null);
      focusCategoryRef.current = id;
      toast.success(`Kategorien «${name}» er laget`);
    });
  }

  function submit(addAnother: boolean) {
    if (categoryPending) return;
    if (newCategory?.trim()) {
      // Don't silently drop a category name that was typed but not added.
      setCategoryError("Trykk «Opprett» for å lage kategorien, eller avbryt.");
      document.getElementById("new-category-name")?.focus();
      return;
    }
    setNewCategory(null);
    setCategoryError(null);
    setErrors({});
    startTransition(async () => {
      const result = await saveItem(eventId, item?.id ?? null, {
        name: form.name,
        target_quantity: form.target_quantity,
        unit: form.unit,
        category_id: form.category_id || null,
        description: form.description,
        allow_extra: form.allow_extra,
        kind: form.kind,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(item ? "Bidraget er oppdatert" : `${form.name} er lagt til`);
      if (addAnother) {
        setForm(empty(form.category_id, form.kind));
        document.getElementById("item-name")?.focus();
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o, details) => {
        if (pending || categoryPending) return;
        // Escape while the inline category creator is open cancels only the creator.
        if (!o && newCategory !== null && details.reason === "escape-key") {
          details.cancel();
          cancelNewCategory();
          return;
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{item ? "Rediger bidrag" : "Legg til bidrag"}</DialogTitle>
          <DialogDescription>Hva trenger dere hjelp til, og hvor mye eller hvor mange?</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <p id="item-kind-label" className="text-sm leading-none font-medium">
              Type bidrag
            </p>
            <div role="group" aria-labelledby="item-kind-label" className="grid grid-cols-2 gap-1.5">
              {ITEM_KIND_VALUES.map((value) => {
                const info = ITEM_KINDS[value];
                const Icon = info.icon;
                const selected = form.kind === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseKind(value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium",
                      selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4 shrink-0" /> {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!item && !form.name && (
            <div className="flex flex-wrap gap-1.5">
              {kind.suggestions.map((s) => {
                const time = formatTimeRange(s.starts_at, s.ends_at);
                return (
                  <button
                    key={`${s.name}-${time ?? ""}`}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        name: s.name,
                        unit: s.unit,
                        target_quantity: String(s.qty),
                        starts_at: s.starts_at ?? "",
                        ends_at: s.ends_at ?? "",
                      }))
                    }
                    className="rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary/50 hover:bg-brand-muted"
                  >
                    + {s.name}
                    {time && <span className="text-muted-foreground"> {time}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="item-name">{form.kind === "bring" ? "Hva trengs?" : "Hva skal gjøres?"}</Label>
            <Input
              id="item-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={kind.namePlaceholder}
              maxLength={80}
              required
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div ref={categorySectionRef} className="space-y-1.5">
            {/* Not a <label>: it names the button group below (aria-labelledby). */}
            <p id="item-category-label" className="flex items-center gap-2 text-sm leading-none font-medium">
              Kategori <span className="font-normal text-muted-foreground">(valgfritt)</span>
            </p>
            {shownCategories.length === 0 && (
              <p id="item-category-help" className="text-sm text-muted-foreground">
                Kategorier deler listen i seksjoner, f.eks. «Mat og drikke» og «Vakter», så deltakerne finner fram.
              </p>
            )}
            <div
              role="group"
              aria-labelledby="item-category-label"
              aria-describedby={shownCategories.length === 0 ? "item-category-help" : undefined}
              className="flex flex-wrap gap-1.5"
            >
              <button
                type="button"
                data-category-focus=""
                onClick={() => update("category_id", "")}
                aria-pressed={!form.category_id}
                className={chip(!form.category_id)}
              >
                Ingen kategori
              </button>
              {shownCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-category-focus={c.id}
                  onClick={() => update("category_id", c.id)}
                  aria-pressed={form.category_id === c.id}
                  title={c.name.length > 24 ? c.name : undefined}
                  className={chip(form.category_id === c.id)}
                >
                  <span className="block truncate">{c.name}</span>
                </button>
              ))}
              {newCategory === null && (
                <button
                  type="button"
                  data-category-focus="new"
                  onClick={openNewCategory}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-dashed px-2.5 text-sm font-medium text-primary hover:border-primary/50 hover:bg-brand-muted"
                >
                  <Plus className="size-4" /> Ny kategori
                </button>
              )}
            </div>
            {newCategory !== null && (
              <div className="flex gap-2 pt-1">
                <Input
                  id="new-category-name"
                  data-category-focus="input"
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    setCategoryError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter") {
                      // Never let Enter here submit the item form.
                      e.preventDefault();
                      addCategory();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelNewCategory();
                    }
                  }}
                  placeholder="Navn på kategori, f.eks. Vakter"
                  maxLength={60}
                  enterKeyHint="done"
                  aria-label="Navn på ny kategori"
                  aria-invalid={Boolean(categoryError)}
                  aria-describedby={categoryError ? "new-category-error" : undefined}
                  readOnly={categoryPending}
                  className="h-10"
                />
                <Button
                  type="button"
                  size="lg"
                  onClick={addCategory}
                  disabled={categoryPending || !newCategory.trim()}
                >
                  {categoryPending ? <Loader2 className="animate-spin" /> : <Plus />} Opprett
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={cancelNewCategory}
                  disabled={categoryPending}
                  aria-label="Avbryt ny kategori"
                >
                  <X />
                </Button>
              </div>
            )}
            {categoryError && (
              <p id="new-category-error" role="alert" className="text-sm text-destructive">
                {categoryError}
              </p>
            )}
          </div>

          {form.kind !== "bring" && (
            <div className="space-y-1.5">
              <p id="item-time-label" className="text-sm leading-none font-medium">
                Tidsrom{" "}
                <span className="font-normal text-muted-foreground">
                  {form.kind === "shift" ? "(anbefalt for vakter)" : "(valgfritt)"}
                </span>
              </p>
              <div role="group" aria-labelledby="item-time-label" className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="item-starts" className="text-muted-foreground">
                    Fra
                  </Label>
                  <Input
                    id="item-starts"
                    type="time"
                    value={form.starts_at}
                    onChange={(e) => update("starts_at", e.target.value)}
                    aria-invalid={Boolean(errors.starts_at)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-ends" className="text-muted-foreground">
                    Til
                  </Label>
                  <Input
                    id="item-ends"
                    type="time"
                    value={form.ends_at}
                    onChange={(e) => update("ends_at", e.target.value)}
                    aria-invalid={Boolean(errors.ends_at)}
                  />
                </div>
              </div>
              {(errors.starts_at || errors.ends_at) && (
                <p className="text-sm text-destructive">{errors.starts_at ?? errors.ends_at}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-qty">{countsPeople ? "Hvor mange?" : "Antall"}</Label>
              <Input
                id="item-qty"
                type="number"
                inputMode="numeric"
                min={1}
                max={100000}
                value={form.target_quantity}
                onChange={(e) => update("target_quantity", e.target.value)}
                placeholder={countsPeople ? "2" : "10"}
                required
                aria-invalid={Boolean(errors.target_quantity)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Enhet</Label>
              <div className="flex flex-wrap gap-1.5">
                {UNITS.slice(0, 6).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => update("unit", u)}
                    aria-pressed={form.unit === u}
                    className={chip(form.unit === u)}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {errors.target_quantity && <p className="-mt-2 text-sm text-destructive">{errors.target_quantity}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="item-unit" className="text-muted-foreground">
              Annen enhet
            </Label>
            <Input
              id="item-unit"
              value={isCustomUnit ? form.unit : ""}
              onChange={(e) => update("unit", e.target.value || kind.defaultUnit)}
              placeholder="F.eks. porsjoner, timer, lag"
              maxLength={20}
              list="kf-units"
            />
            <datalist id="kf-units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-description">
              Beskrivelse <span className="font-normal text-muted-foreground">(valgfritt)</span>
            </Label>
            <Textarea
              id="item-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder={
                form.kind === "bring"
                  ? "F.eks. «Langpanne. Merk med allergener.»"
                  : "F.eks. «Oppmøte ved hovedinngangen. Ta med arbeidshansker.»"
              }
              maxLength={500}
              rows={2}
            />
          </div>

          <label className="flex items-start justify-between gap-4 rounded-xl bg-muted/60 p-3">
            <span className="text-sm">
              <span className="font-medium">Tillat ekstra bidrag</span>
              <span className="block text-muted-foreground">Folk kan melde seg på selv om målet er nådd.</span>
            </span>
            <Switch checked={form.allow_extra} onCheckedChange={(v) => update("allow_extra", v)} className="mt-1" />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {/* Discards what was typed. DialogClose goes through the Dialog's onOpenChange above,
                so the pending guards apply there too. First in DOM: bottom when stacked, left in a row. */}
            <DialogClose
              type="button"
              disabled={pending || categoryPending}
              render={<Button variant="ghost" size="xl" />}
            >
              Lukk
            </DialogClose>
            {!item && (
              <Button type="button" variant="outline" size="xl" className="sm:flex-1" disabled={pending || categoryPending} onClick={() => submit(true)}>
                Lagre og legg til flere
              </Button>
            )}
            <Button type="submit" size="xl" className="sm:flex-1" disabled={pending || categoryPending}>
              {pending && <Loader2 className="animate-spin" />}
              {item ? "Lagre" : "Legg til"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
