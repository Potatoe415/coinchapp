"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "coinchapp-hub-name";
const AVATAR_STORAGE_KEY = "coinchapp-hub-avatar";
const MAX_AVATAR_CHARS = 8000;

/** Remember `?name=` / `?avatar=` from the Bergamots hub so later in-app
 *  routes can pre-fill identity after Play Online drops the original query. */
export function captureHubName() {
  if (typeof window === "undefined") return;
  captureParam("name", STORAGE_KEY, Boolean);
  captureParam("avatar", AVATAR_STORAGE_KEY, isHubAvatar);
}

export function readHubPrefillName() {
  return readParam("name", STORAGE_KEY, Boolean);
}

export function readHubPrefillAvatar() {
  return readParam("avatar", AVATAR_STORAGE_KEY, isHubAvatar);
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

export function useHubPrefillAvatar() {
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    const prefill = readHubPrefillAvatar();
    if (!prefill) return;
    // Post-hydration browser read: deferred to after mount to avoid an SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvatar(prefill);
  }, []);
  return avatar;
}

function isHubAvatar(value: string) {
  return value.startsWith("data:image/") && value.length <= MAX_AVATAR_CHARS;
}

function captureParam(
  queryKey: string,
  storageKey: string,
  accept: (value: string) => boolean,
) {
  const fromUrl = new URLSearchParams(window.location.search).get(queryKey)?.trim();
  if (!fromUrl || !accept(fromUrl)) return;
  try {
    sessionStorage.setItem(storageKey, fromUrl);
  } catch {
    // Storage unavailable — the URL param is still used when present.
  }
}

function readParam(
  queryKey: string,
  storageKey: string,
  accept: (value: string) => boolean,
) {
  if (typeof window === "undefined") return "";
  try {
    const fromUrl = new URLSearchParams(window.location.search)
      .get(queryKey)
      ?.trim();
    if (fromUrl && accept(fromUrl)) {
      sessionStorage.setItem(storageKey, fromUrl);
      return fromUrl;
    }
    const stored = sessionStorage.getItem(storageKey) || "";
    return accept(stored) ? stored : "";
  } catch {
    return "";
  }
}
