"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { updatePassword, type AuthState } from "../actions";
import { AuthCard, FormError } from "../auth-card";

export default function NewPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});

  return (
    <AuthCard title="Lag nytt passord">
      <form action={action} className="space-y-4">
        <FormError message={state.error} />
        <div className="space-y-1.5">
          <Label htmlFor="password">Nytt passord</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <p className="text-xs text-muted-foreground">Minst 8 tegn.</p>
        </div>
        <SubmitButton size="xl" className="w-full" pendingText="Lagrer …">
          Lagre passord
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
