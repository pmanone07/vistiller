"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2, Loader2, LogOut, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "@/app/(auth)/actions";
import type { Organization } from "@/lib/types";
import { createOrganization, renameOrganization } from "../actions";

export function SettingsView({ email, organizations }: { email: string; organizations: Organization[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="flex items-center gap-2 font-semibold">
          <Building2 className="size-5 text-primary" /> {organizations.length > 1 ? "Korps" : "Korpset"}
        </h2>
        {organizations.map((org) => (
          <OrganizationForm key={org.id} organization={org} />
        ))}
        <NewOrganization />
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="flex items-center gap-2 font-semibold">
          <UserRound className="size-5 text-primary" /> Konto
        </h2>
        <p className="text-sm">
          Innlogget som <span className="font-medium">{email}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Abonnement: <span className="font-medium text-foreground">Gratis</span>. Flere administratorer, påminnelser
          og eksport kommer i betalte planer.
        </p>
        <Button variant="outline" size="lg" disabled={pending} onClick={() => startTransition(() => signOut())}>
          {pending ? <Loader2 className="animate-spin" /> : <LogOut />} Logg ut
        </Button>
      </section>
    </div>
  );
}

function OrganizationForm({ organization }: { organization: Organization }) {
  const [name, setName] = useState(organization.name);
  const [pending, startTransition] = useTransition();
  const changed = name.trim() !== organization.name;

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await renameOrganization(organization.id, name);
          if (!result.ok) return void toast.error(result.error);
          toast.success("Navnet er lagret");
        });
      }}
    >
      <Label htmlFor={`org-${organization.id}`}>Navn</Label>
      <div className="flex gap-2">
        <Input id={`org-${organization.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        <Button type="submit" size="lg" className="h-11" disabled={!changed || pending}>
          {pending && <Loader2 className="animate-spin" />} Lagre
        </Button>
      </div>
    </form>
  );
}

function NewOrganization() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="ghost" size="lg" className="text-primary" onClick={() => setOpen(true)}>
        <Plus /> Legg til et korps til
      </Button>
    );
  }

  return (
    <form
      className="space-y-1.5 rounded-xl bg-muted/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createOrganization(name);
          if (!result.ok) return void toast.error(result.error);
          toast.success(`${name} er opprettet`);
          setName("");
          setOpen(false);
        });
      }}
    >
      <Label htmlFor="new-org">Nytt korps</Label>
      <div className="flex gap-2">
        <Input id="new-org" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoFocus placeholder="Navn" />
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Opprett
        </Button>
      </div>
    </form>
  );
}
