"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { signIn, type AuthState } from "../actions";
import { FormError } from "../auth-card";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});
  const linkError =
    params.get("feil") === "lenke" ? "Lenken er ugyldig eller utløpt. Prøv å logge inn, eller be om en ny lenke." : undefined;

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error ?? linkError} />
      <input type="hidden" name="next" value={params.get("neste") ?? "/dashboard"} />
      <div className="space-y-1.5">
        <Label htmlFor="email">E-post</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Passord</Label>
          <Link href="/glemt-passord" className="text-sm text-primary hover:underline">
            Glemt passord?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton size="xl" className="w-full" pendingText="Logger inn …">
        Logg inn
      </SubmitButton>
    </form>
  );
}
