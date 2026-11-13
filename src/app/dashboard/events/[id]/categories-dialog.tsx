"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Category } from "@/lib/types";
import { createCategory, deleteCategory, renameCategory } from "../../actions";

const SUGGESTED = ["Mat og drikke", "Oppgaver", "Vakter", "Transport", "Utstyr"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  categories: Category[];
}

export function CategoriesDialog({ open, onOpenChange, eventId, categories }: Props) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [saving, startSaving] = useTransition();
  const busy = pending || saving;

  // The dialog stays mounted in event-admin.tsx, so clear half-typed input each time it opens.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset transient state each time the dialog opens
    setName("");
    setEditing(null);
  }, [open]);

  const add = (value: string) =>
    startTransition(async () => {
      const result = await createCategory(eventId, value);
      if (!result.ok) return void toast.error(result.error);
      setName("");
    });

  const saveRename = () =>
    editing &&
    startTransition(async () => {
      const result = await renameCategory(editing.id, editing.name);
      if (!result.ok) return void toast.error(result.error);
      setEditing(null);
    });

  /** "Lagre": commit a typed-but-not-added name and an in-progress rename, then close. */
  const saveAndClose = () => {
    if (busy) return;
    const newName = name;
    const rename = editing;
    startSaving(async () => {
      let failed = false;
      if (rename) {
        const current = categories.find((c) => c.id === rename.id);
        if (current && current.name === rename.name.trim()) {
          setEditing(null);
        } else {
          const result = await renameCategory(rename.id, rename.name);
          if (result.ok) setEditing(null);
          else {
            toast.error(result.error);
            failed = true;
          }
        }
      }
      if (newName.trim()) {
        const result = await createCategory(eventId, newName);
        if (result.ok) setName("");
        else {
          toast.error(result.error);
          failed = true;
        }
      }
      if (failed) return;
      toast.success("Kategoriene er lagret");
      onOpenChange(false);
    });
  };

  const unused = SUGGESTED.filter((s) => !categories.some((c) => c.name.toLowerCase() === s.toLowerCase()));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Kategorier</DialogTitle>
          <DialogDescription>
            Valgfritt. Grupper listen, f.eks. «Mat og drikke» og «Vakter». Små arrangementer klarer seg fint uten.
          </DialogDescription>
        </DialogHeader>

        {categories.length > 0 && (
          <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 p-2 pl-3">
                {editing?.id === c.id ? (
                  <>
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), saveRename())}
                      maxLength={60}
                      autoFocus
                      className="h-9"
                    />
                    <Button size="icon-lg" variant="ghost" onClick={saveRename} disabled={busy} aria-label="Lagre">
                      <Check />
                    </Button>
                    <Button size="icon-lg" variant="ghost" onClick={() => setEditing(null)} aria-label="Avbryt">
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{c.name}</span>
                    <Button size="icon-lg" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name })} aria-label={`Gi nytt navn til ${c.name}`}>
                      <Pencil />
                    </Button>
                    <Button size="icon-lg" variant="ghost" onClick={() => setToDelete(c)} aria-label={`Slett ${c.name}`}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            add(name);
          }}
          className="flex gap-2"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ny kategori" maxLength={60} aria-label="Ny kategori" />
          <Button type="submit" size="lg" className="h-11" disabled={busy || !name.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Legg til
          </Button>
        </form>

        {unused.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {unused.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => add(s)}
                className="rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary/50 hover:bg-brand-muted"
              >
                + {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {/* Closes without committing a half-typed name or rename. DialogClose goes through the
              Dialog's onOpenChange above, so the pending guard applies. First in DOM: bottom when
              stacked, left in a row. */}
          <DialogClose type="button" disabled={busy} render={<Button variant="ghost" size="xl" />}>
            Lukk
          </DialogClose>
          {/* type="button" and outside the add form, so Enter in "Ny kategori" never triggers it. */}
          <Button type="button" size="xl" className="sm:flex-1" disabled={busy} onClick={saveAndClose}>
            {saving && <Loader2 className="animate-spin" />}
            Lagre
          </Button>
        </div>

        <ConfirmDialog
          open={Boolean(toDelete)}
          onOpenChange={(o) => !o && setToDelete(null)}
          title={`Slette «${toDelete?.name}»?`}
          description="Bidragene i kategorien blir ikke slettet, de flyttes bare ut av kategorien."
          onConfirm={async () => {
            if (!toDelete) return;
            const result = await deleteCategory(toDelete.id);
            if (!result.ok) {
              toast.error(result.error);
              return false;
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
