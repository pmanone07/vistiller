"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the list fresh while it's open: re-fetches server data every
 * `intervalMs` while the tab is visible, and right away when it becomes visible
 * again (e.g. coming back from a chat app). Client state such as the current
 * selection is preserved by router.refresh().
 */
export function useAutoRefresh(intervalMs = 20000, enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs, enabled]);
}
