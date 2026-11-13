import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "../auth-card";
import { RedirectIfSignedIn } from "../redirect-if-signed-in";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Opprett konto" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Kom i gang gratis"
      subtitle="Opprett ditt første arrangement på et par minutter."
      footer={
        <>
          Har du allerede konto?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Logg inn
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <RegisterForm />
    </AuthCard>
  );
}
