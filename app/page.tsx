"use client";

import Link from "next/link";
import { useI18n } from "@/lib/client/i18n";
import { useInstallPrompt } from "@/lib/client/useInstallPrompt";
import { HomeTopBar } from "@/components/HomeTopBar";
import type { GameType } from "@/lib/supabase/types";

async function resetBrowserData() {
  localStorage.clear();
  sessionStorage.clear();

  document.cookie.split(";").forEach((cookie) => {
    const [rawName] = cookie.split("=");
    const name = rawName?.trim();
    if (!name) return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  // Force the app update: an old service worker could otherwise keep serving
  // a stale cached shell even after caches are cleared above.
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("indexedDB" in window && typeof indexedDB.databases === "function") {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases
        .map((db) => db.name)
        .filter((name): name is string => Boolean(name))
        .map(
          (name) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
    );
  }

  window.location.reload();
}

/** Forces the latest deployed version without wiping local game saves: drops
 *  the service worker's cached shell/assets and unregisters it so the next
 *  load re-registers a fresh one, then reloads. Unlike `resetBrowserData`,
 *  this keeps localStorage/sessionStorage/IndexedDB (local game state) intact. */
async function forceUpdate() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  window.location.reload();
}

interface GameTile {
  game: GameType;
  href: string;
  /** Same art as that game's own splash screen (`app/<game>/page.tsx`), so the
   *  tile previews what's behind it. */
  image: string;
  titleKey: "gameTabCoinche" | "gameTabBouilla" | "gameTabPresident";
  accent: string;
}

const TILES: GameTile[] = [
  { game: "coinche", href: "/coinche", image: "/splashscreen.jpg", titleKey: "gameTabCoinche", accent: "var(--accent-yellow)" },
  { game: "bouilla", href: "/bouilla", image: "/bouilla-full.jpg", titleKey: "gameTabBouilla", accent: "var(--accent-cyan)" },
  { game: "president", href: "/president", image: "/president-full.jpg", titleKey: "gameTabPresident", accent: "var(--accent-green)" },
];

/** App landing screen: a list of game tiles. Tapping one navigates to that
 *  game's own splash screen (`/coinche`, `/bouilla`, `/president`), which each
 *  offer the local/online/ad-hoc mode picker and the game's own rules. */
export default function Home() {
  const { t } = useI18n();
  const { installable, promptInstall } = useInstallPrompt();

  return (
    <main
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center overflow-hidden bg-felt"
      data-id="home-screen"
    >
      <HomeTopBar />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center gap-3 px-6 pt-[18vh]" data-id="game-tiles">
        <header className="mb-2 text-center">
          <h1 className="text-2xl font-black tracking-tight text-white" data-id="home-title">
            {t("chooseGameTitle")}
          </h1>
          <p className="text-sm text-white/70">{t("chooseGameSubtitle")}</p>
        </header>

        <div className="grid w-full grid-cols-3 gap-3" data-id="game-tiles-grid">
          {TILES.map((tile) => (
            <Link
              key={tile.game}
              href={tile.href}
              data-id={`game-tile-${tile.game}`}
              className="relative aspect-square overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/15 transition active:scale-95"
              style={{ backgroundImage: `url('${tile.image}')`, backgroundSize: "cover", backgroundPosition: "center top" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
              <span
                className="absolute inset-x-0 bottom-0 px-1.5 pb-2 text-center text-[13px] font-black leading-tight"
                style={{ color: tile.accent }}
              >
                {t(tile.titleKey)}
              </span>
            </Link>
          ))}
        </div>

        {installable && (
          <button
            data-id="install-app-button"
            onClick={promptInstall}
            className="mt-2 w-full rounded-2xl border border-white/40 bg-transparent px-4 py-3 text-sm font-bold text-white/85 transition hover:border-white/60 hover:text-white active:scale-95"
          >
            {t("installButton")}
          </button>
        )}
      </div>

      <div className="relative z-10 mb-4 flex items-center gap-3 self-center" data-id="home-footer-actions">
        <button
          data-id="force-update-button"
          onClick={forceUpdate}
          className="rounded-lg border border-white/40 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/60 hover:text-white/90 active:scale-95"
        >
          Actualiser
        </button>
        <button
          data-id="reset-browser-data-button"
          onClick={resetBrowserData}
          className="rounded-lg border border-white/40 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/60 hover:text-white/90 active:scale-95"
        >
          Reset
        </button>
        <span className="text-sm font-medium text-white/60" data-id="app-version-label">
          V{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
      </div>
    </main>
  );
}
