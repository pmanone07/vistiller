import Link from "next/link";
import { Link2Off } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

/**
 * Shown when the token in the URL cannot be a share token at all (wrong length
 * or characters), which in practice means the link was cut off or altered when
 * it was copied. No database lookup has been made.
 */
export function InvalidLink() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <LogoMark className="size-10" />
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Link2Off className="size-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Lenken er ikke gyldig</h1>
      <p className="text-muted-foreground">
        Det ser ut til at lenken er ufullstendig. En del av den kan ha falt bort da den ble kopiert. Åpne lenken på
        nytt fra meldingen du fikk, eller be arrangøren om å dele den en gang til.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        Til forsiden
      </Link>
    </div>
  );
}
