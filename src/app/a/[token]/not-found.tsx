import Link from "next/link";
import { SearchX } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function EventNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <LogoMark className="size-10" />
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Fant ikke bidragslisten</h1>
      <p className="text-muted-foreground">
        Lenken kan være skrevet feil, eller arrangøren har laget en ny lenke. Be arrangøren om å dele lenken på nytt.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        Til forsiden
      </Link>
    </main>
  );
}
