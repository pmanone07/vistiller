import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { DashboardNav } from "./dashboard-nav";
import { UserMenu } from "./user-menu";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-(--safe-top) z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
          <Logo href="/dashboard" />
          <DashboardNav className="ml-auto hidden sm:flex" />
          <div className="ml-auto sm:ml-0">
            <Suspense fallback={<div className="size-9 rounded-full bg-muted" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:pb-12">{children}</main>
      {/* Mobile bottom navigation */}
      <DashboardNav
        variant="bottom"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      />
    </div>
  );
}
