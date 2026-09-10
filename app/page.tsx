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

interface GameTile {
  game: GameType;
  href: string;
  titleKey: "gameTabCoinche" | "gameTabBouilla" | "gameTabPresident";
  descKey: "coincheTileDesc" | "bouillaTileDesc" | "presidentTileDesc";
  accent: string;
}

const TILES: GameTile[] = [
  { game: "coinche", href: "/coinche", titleKey: "gameTabCoinche", descKey: "coincheTileDesc", accent: "var(--accent-yellow)" },
  { game: "bouilla", href: "/bouilla", titleKey: "gameTabBouilla", descKey: "bouillaTileDesc", accent: "var(--accent-cyan)" },
  { game: "president", href: "/president", titleKey: "gameTabPresident", descKey: "presidentTileDesc", accent: "var(--accent-green)" },
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

        {TILES.map((tile) => (
          <Link
            key={tile.game}
            href={tile.href}
            data-id={`game-tile-${tile.game}`}
            className="w-full rounded-2xl bg-black/25 px-5 py-4 text-left shadow-lg ring-1 ring-white/10 transition active:scale-[0.98]"
          >
            <span
              className="mb-1 block text-lg font-black"
              style={{ color: tile.accent }}
            >
              {t(tile.titleKey)}
            </span>
            <span className="block text-sm text-white/70">{t(tile.descKey)}</span>
          </Link>
        ))}

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
