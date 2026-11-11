import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logg inn" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Logg inn"
      subtitle="For arrangører i korpset"
      footer={
        <>
          Ny her?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Opprett gratis konto
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
