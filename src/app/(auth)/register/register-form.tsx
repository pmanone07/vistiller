"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { signUp, type AuthState } from "../actions";
import { FormError, FormSuccess } from "../auth-card";

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});

  if (state.message) return <FormSuccess message={state.message} />;

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <div className="space-y-1.5">
        <Label htmlFor="organization">Navn på lag, klasse eller forening</Label>
        <Input
          id="organization"
          name="organization"
          placeholder="F.eks. FAU Solberg skole"
          autoComplete="organization"
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-post</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Passord</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">Minst 8 tegn.</p>
      </div>
      <SubmitButton size="xl" className="w-full" pendingText="Oppretter konto …">
        Opprett konto
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">
        Deltakerne trenger ikke konto. De melder seg på via lenken du deler.
      </p>
    </form>
  );
}
