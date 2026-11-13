"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, type EventType } from "@/lib/kinds";
import { EVENT_TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";
import { createEvent, updateEvent } from "../actions";

export interface EventFormValues {
  title: string;
  event_date: string;
  location: string;
  description: string;
  event_type: EventType | "";
}

interface Props {
  /** Edit mode when set. */
  eventId?: string;
  initial?: Partial<EventFormValues>;
  organizations?: Pick<Organization, "id" | "name">[];
  submitLabel?: string;
  onDone?: () => void;
}

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const optional = <span className="font-normal text-muted-foreground">(valgfritt)</span>;

export function EventForm({ eventId, initial, organizations = [], submitLabel, onDone }: Props) {
  const [values, setValues] = useState<EventFormValues>({
    title: initial?.title ?? "",
    event_date: initial?.event_date ?? "",
    location: initial?.location ?? "",
    description: initial?.description ?? "",
    event_type: initial?.event_type ?? "",
  });
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  /** Template to start from when creating; "" is an empty event. */
  const [templateId, setTemplateId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const set = (key: keyof EventFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const template = EVENT_TEMPLATES.find((t) => t.id === id);
    // A template suggests a type, but never overrides one the organizer picked.
    if (template) setValues((v) => (v.event_type ? v : { ...v, event_type: template.eventType }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = eventId
        ? await updateEvent(eventId, values)
        : await createEvent(organizationId, values, templateId || null);
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
          <Label htmlFor="ev-org">Organisasjon</Label>
          <select
            id="ev-org"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className={selectClass}
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
          placeholder="F.eks. Sommeravslutning 5B"
          maxLength={120}
          required
          autoFocus={!eventId}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-type">Type arrangement {optional}</Label>
        <select
          id="ev-type"
          value={values.event_type}
          onChange={(e) => setValues((v) => ({ ...v, event_type: e.target.value as EventType | "" }))}
          className={selectClass}
          aria-invalid={Boolean(errors.event_type)}
        >
          <option value="">Ikke valgt</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.event_type && <p className="text-sm text-destructive">{errors.event_type}</p>}
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
          <Label htmlFor="ev-location">Sted {optional}</Label>
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
        <Label htmlFor="ev-description">Beskrivelse {optional}</Label>
        <Textarea
          id="ev-description"
          value={values.description}
          onChange={set("description")}
          placeholder="Praktisk info til deltakerne: oppmøte, hvor bidrag skal leveres, allergier og lignende."
          maxLength={2000}
          rows={4}
        />
      </div>

      {!eventId && (
        <fieldset className="space-y-2">
          <legend className="text-sm leading-none font-medium">Start med en mal {optional}</legend>
          <p className="text-sm text-muted-foreground">
            Malen legger inn forslag til oppgaver og bidrag. Du kan endre og slette alt etterpå.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <TemplateOption
              selected={templateId === ""}
              onSelect={() => chooseTemplate("")}
              name="Tomt arrangement"
              summary="Legg inn alt selv"
              empty
            />
            {EVENT_TEMPLATES.map((t) => (
              <TemplateOption
                key={t.id}
                selected={templateId === t.id}
                onSelect={() => chooseTemplate(t.id)}
                name={t.name}
                summary={t.summary}
              />
            ))}
          </div>
        </fieldset>
      )}

      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel ?? (eventId ? "Lagre endringer" : "Opprett arrangement")}
      </Button>
    </form>
  );
}

function TemplateOption({
  selected,
  onSelect,
  name,
  summary,
  empty = false,
}: {
  selected: boolean;
  onSelect: () => void;
  name: string;
  summary: string;
  empty?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-16 items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
        selected ? "border-primary bg-brand-muted ring-1 ring-primary" : "bg-card hover:bg-muted",
        empty && !selected && "border-dashed",
      )}
    >
      {empty && <FilePlus2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0">
        <span className="block font-medium">{name}</span>
        <span className="block text-sm text-muted-foreground">{summary}</span>
      </span>
    </button>
  );
}
