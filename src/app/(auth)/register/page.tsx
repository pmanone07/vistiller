import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Opprett konto" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Kom i gang gratis"
      subtitle="Lag din første bidragsliste på et par minutter."
      footer={
        <>
          Har du allerede konto?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Logg inn
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
