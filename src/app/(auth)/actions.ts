"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAuthWeakPasswordError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { GENERIC_ERROR } from "@/lib/errors";
import { safeNextPath } from "@/lib/safe-redirect";

export interface AuthState {
  error?: string;
  message?: string;
  email?: string;
}

/** Maps Supabase Auth errors (by `code`, falling back to the English message) to Norwegian. */
const AUTH_MESSAGES = {
  invalidCredentials: "Feil e-post eller passord.",
  emailNotConfirmed: "Du må bekrefte e-postadressen din først. Sjekk innboksen (og søppelpost).",
  alreadyRegistered: "Det finnes allerede en konto med denne e-postadressen. Prøv å logge inn.",
  samePassword: "Det nye passordet må være forskjellig fra det gamle.",
  pwnedPassword: "Dette passordet er kjent fra datalekkasjer og lett å gjette. Velg et annet passord.",
  passwordCharacters:
    "Passordet er for svakt. Bruk en blanding av små og store bokstaver, tall og spesialtegn.",
  passwordTooShort: "Passordet er for kort.",
  weakPassword: "Passordet er for svakt. Velg et lengre eller mer uvanlig passord.",
  reauthenticationNeeded: "Av sikkerhetshensyn må du logge inn på nytt før du endrer passordet.",
  rateLimited: "For mange forsøk. Vent litt og prøv igjen.",
};

function authErrorMessage(error: AuthError) {
  const code = error.code ?? "";
  const m = error.message.toLowerCase();

  if (code === "invalid_credentials" || m.includes("invalid login credentials"))
    return AUTH_MESSAGES.invalidCredentials;
  if (code === "email_not_confirmed" || m.includes("email not confirmed"))
    return AUTH_MESSAGES.emailNotConfirmed;
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    m.includes("already registered") ||
    m.includes("already been registered")
  )
    return AUTH_MESSAGES.alreadyRegistered;
  if (code === "same_password" || m.includes("different from the old password"))
    return AUTH_MESSAGES.samePassword;
  if (code === "reauthentication_needed" || m.includes("requires reauthentication"))
    return AUTH_MESSAGES.reauthenticationNeeded;

  if (code === "weak_password" || isAuthWeakPasswordError(error)) {
    const reasons = isAuthWeakPasswordError(error) ? error.reasons : [];
    if (reasons.includes("pwned") || m.includes("known to be weak") || m.includes("pwned"))
      return AUTH_MESSAGES.pwnedPassword;
    if (reasons.includes("characters") || m.includes("should contain"))
      return AUTH_MESSAGES.passwordCharacters;
    if (reasons.includes("length") || m.includes("at least")) {
      const min = m.match(/at least (\d+) characters/)?.[1];
      return min ? `Passordet må ha minst ${min} tegn.` : AUTH_MESSAGES.passwordTooShort;
    }
    return AUTH_MESSAGES.weakPassword;
  }

  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    error.status === 429 ||
    m.includes("rate limit") ||
    m.includes("too many")
  )
    return AUTH_MESSAGES.rateLimited;
  return GENERIC_ERROR;
}

const credentials = z.object({
  email: z.email("Skriv inn en gyldig e-postadresse."),
  password: z.string().min(8, "Passordet må ha minst 8 tegn.").max(72),
});

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Fyll inn e-post og passord.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error), email };

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const orgName = String(formData.get("organization") ?? "").trim().slice(0, 100);
  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard`,
      data: orgName ? { organization_name: orgName } : undefined,
    },
  });
  if (error) return { error: authErrorMessage(error), email };

  // Email confirmation disabled → we already have a session.
  if (data.session) redirect("/dashboard");

  return {
    message: `Vi har sendt en bekreftelseslenke til ${parsed.data.email}. Åpne den for å komme i gang.`,
    email,
  };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!z.email().safeParse(email).success) return { error: "Skriv inn en gyldig e-postadresse.", email };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/nytt-passord`,
  });
  // Same answer whether or not the account exists (no account enumeration).
  return { message: "Hvis det finnes en konto for adressen, har vi sendt en lenke for å lage nytt passord.", email };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Passordet må ha minst 8 tegn." };

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Lenken er utløpt. Be om en ny lenke for å lage nytt passord." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error) };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
