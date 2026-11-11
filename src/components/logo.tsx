import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Korpsfix mark: a music note on a rounded square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#3b4fd8" />
      <circle cx="13.2" cy="21.2" r="3.9" fill="#fff" />
      <rect x="15.3" y="7.5" width="2.4" height="14" rx="1.2" fill="#fff" />
      <path d="M16.5 7.6c3.6.6 6.4 2.7 6.4 6.6-1.4-1.9-3.6-2.8-6.4-3Z" fill="#9ff0c4" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className="size-8" />
      <span className="text-lg">Korpsfix</span>
    </Link>
  );
}
