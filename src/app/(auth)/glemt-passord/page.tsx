"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { requestPasswordReset, type AuthState } from "../actions";
import { AuthCard, FormError, FormSuccess } from "../auth-card";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, {});

  return (
    <AuthCard
      title="Glemt passord"
      subtitle="Vi sender deg en lenke for å lage nytt passord."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Tilbake til innlogging
        </Link>
      }
    >
      {state.message ? (
        <FormSuccess message={state.message} />
      ) : (
        <form action={action} className="space-y-4">
          <FormError message={state.error} />
          <div className="space-y-1.5">
            <Label htmlFor="email">E-post</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
          </div>
          <SubmitButton size="xl" className="w-full" pendingText="Sender …">
            Send lenke
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
