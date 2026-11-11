import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <LogoMark className="size-12" />
      <h1 className="text-2xl font-bold">Siden finnes ikke</h1>
      <p className="text-muted-foreground">Lenken kan være feil, eller siden er flyttet.</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Til forsiden
      </Link>
    </main>
  );
}
