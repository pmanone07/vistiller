"use client";

import { useEffect } from "react";

/** Registers the service worker (production only) for PWA install + offline page. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not critical: the app works fine without a service worker.
    });
  }, []);
  return null;
}
