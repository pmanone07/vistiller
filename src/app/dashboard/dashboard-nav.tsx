"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Arrangementer", icon: CalendarHeart, exact: true },
  { href: "/dashboard/events/new", label: "Nytt", icon: Plus, exact: true },
  { href: "/dashboard/settings", label: "Innstillinger", icon: Settings, exact: false },
];

interface NavProps {
  className?: string;
  variant?: "top" | "bottom";
}

/** The pathname is request data, so the active state streams in behind Suspense. */
export function DashboardNav(props: NavProps) {
  return (
    <Suspense fallback={<NavLinks {...props} pathname={null} />}>
      <NavWithPathname {...props} />
    </Suspense>
  );
}

function NavWithPathname(props: NavProps) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({ className, variant = "top", pathname }: NavProps & { pathname: string | null }) {
  const isActive = (href: string, exact: boolean) =>
    pathname !== null && (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  if (variant === "bottom") {
    return (
      <nav className={className} aria-label="Hovedmeny">
        {LINKS.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium",
              isActive(href, exact) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn("items-center gap-1", className)} aria-label="Hovedmeny">
      {LINKS.filter((l) => l.href !== "/dashboard/events/new").map(({ href, label, exact }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(href, exact) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
