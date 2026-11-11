"use client";

import { useAutoRefresh } from "./use-auto-refresh";

/** Drop into a server-rendered page to keep its data fresh while it is open. */
export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  useAutoRefresh(intervalMs);
  return null;
}
