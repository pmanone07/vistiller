import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The ViStiller mark: a person with both arms raised, forming a V, on a
 * rounded square. Keep in sync with public/icons/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#0f766e" />
      <path d="M8.5 11.5 16 24l7.5-12.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="10.2" r="3" fill="#fdba74" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className="size-8" />
      <span className="text-lg">{BRAND.name}</span>
    </Link>
  );
}
