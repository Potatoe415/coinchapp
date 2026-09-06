"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "coinchapp-hub-name";

/** Remember `?name=` from the Bergamots hub so later in-app routes can pre-fill
 *  the nickname after Play Online drops the original query string. */
export function captureHubName() {
  if (typeof window === "undefined") return;
  const fromUrl = new URLSearchParams(window.location.search).get("name")?.trim();
  if (!fromUrl) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, fromUrl);
  } catch {
    // Storage unavailable — the URL param is still used when present.
  }
}

export function readHubPrefillName() {
  if (typeof window === "undefined") return "";
  try {
    const fromUrl = new URLSearchParams(window.location.search)
      .get("name")
      ?.trim();
    if (fromUrl) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function withHubName(href: string) {
  const name = readHubPrefillName();
  if (!name) return href;
  const url = new URL(href, "http://local.invalid");
  if (!url.searchParams.has("name")) url.searchParams.set("name", name);
  return `${url.pathname}${url.search}`;
}

export function useHubPrefillName() {
  const [name, setName] = useState("");
  useEffect(() => {
    const prefill = readHubPrefillName();
    if (!prefill) return;
    // Post-hydration browser read: deferred to after mount to avoid an SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName((current) => current || prefill);
  }, []);
  return [name, setName] as const;
}
