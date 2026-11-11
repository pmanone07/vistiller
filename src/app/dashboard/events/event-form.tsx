"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Organization } from "@/lib/types";
import { createEvent, updateEvent } from "../actions";

export interface EventFormValues {
  title: string;
  event_date: string;
  location: string;
  description: string;
}

interface Props {
  /** Edit mode when set. */
  eventId?: string;
  initial?: Partial<EventFormValues>;
  organizations?: Pick<Organization, "id" | "name">[];
  submitLabel?: string;
  onDone?: () => void;
}

export function EventForm({ eventId, initial, organizations = [], submitLabel, onDone }: Props) {
  const [values, setValues] = useState<EventFormValues>({
    title: initial?.title ?? "",
    event_date: initial?.event_date ?? "",
    location: initial?.location ?? "",
    description: initial?.description ?? "",
  });
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const set = (key: keyof EventFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = eventId ? await updateEvent(eventId, values) : await createEvent(organizationId, values);
      // createEvent redirects on success, so we only get here on error or after an update.
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Arrangementet er oppdatert");
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!eventId && organizations.length > 1 && (
        <div className="space-y-1.5">
          <Label htmlFor="ev-org">Korps</Label>
          <select
            id="ev-org"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="ev-title">Navn på arrangementet</Label>
        <Input
          id="ev-title"
          value={values.title}
          onChange={set("title")}
          placeholder="F.eks. Loppemarked – Våren 2027"
          maxLength={120}
          required
          autoFocus={!eventId}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-date">Dato</Label>
          <Input
            id="ev-date"
            type="date"
            value={values.event_date}
            onChange={set("event_date")}
            aria-invalid={Boolean(errors.event_date)}
          />
          {errors.event_date && <p className="text-sm text-destructive">{errors.event_date}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-location">
            Sted <span className="font-normal text-muted-foreground">(valgfritt)</span>
          </Label>
          <Input
            id="ev-location"
            value={values.location}
            onChange={set("location")}
            placeholder="F.eks. Gymsalen"
            maxLength={200}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-description">
          Beskrivelse <span className="font-normal text-muted-foreground">(valgfritt)</span>
        </Label>
        <Textarea
          id="ev-description"
          value={values.description}
          onChange={set("description")}
          placeholder="Praktisk info til foreldrene: når og hvor bidrag skal leveres, allergier, osv."
          maxLength={2000}
          rows={4}
        />
      </div>
      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel ?? (eventId ? "Lagre endringer" : "Opprett arrangement")}
      </Button>
    </form>
  );
}
