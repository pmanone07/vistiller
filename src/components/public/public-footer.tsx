import Link from "next/link";
import { LogoMark } from "@/components/logo";

export function PublicFooter() {
  return (
    <footer className="border-t bg-card/50 py-6 text-center text-xs text-muted-foreground">
      <Link href="/" className="inline-flex items-center gap-1.5 hover:text-foreground">
        <LogoMark className="size-4" />
        Laget med ViStiller – sammen får vi det til
      </Link>
    </footer>
  );
}
