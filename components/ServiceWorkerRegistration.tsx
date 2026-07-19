"use client";

import { useEffect } from "react";

/** Registers the offline-shell service worker (see public/sw.js). Silent no-op
 *  if unsupported (e.g. some in-app browsers) - never blocks rendering. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
