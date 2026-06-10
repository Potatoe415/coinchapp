"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/client/i18n";

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
}

const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"];

export default function Home() {
  const router = useRouter();
  const { locale, t } = useI18n();

  return (
    <main
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between px-6 py-12"
      data-id="home-screen"
    >
      <div className="flex flex-1 flex-col items-center justify-start gap-6 pt-8 text-center">
        <div className="flex gap-4 text-4xl" data-id="splash-suits" aria-hidden="true">
          {SUIT_SYMBOLS.map((s) => (
            <span
              key={s}
              className={s === "♥" || s === "♦" ? "text-[var(--accent-red)]" : "text-[var(--card-ink)]"}
            >
              {s}
            </span>
          ))}
        </div>

        <div data-id="splash-title">
          <h1 className="text-6xl font-black tracking-tight text-[var(--surface)]">Coinche</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            {locale === "fr"
              ? "Jouez en local contre des bots, ou à 4 en ligne."
              : "Play local against bots, or online with 4 players."}
          </p>
        </div>

        <div className="mt-6 flex w-full flex-col gap-3" data-id="splash-actions">
          <button
            data-id="play-local-button"
            onClick={() => router.push("/local")}
            className="rounded-2xl bg-[var(--accent-yellow)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
          >
            {t("playLocal")}
            <span className="mt-0.5 block text-xs font-medium text-[var(--surface)]/80">
              {t("localOfflineNote")}
            </span>
          </button>

          <button
            data-id="play-online-button"
            onClick={() => router.push("/online?target=1000")}
            className="rounded-2xl bg-[var(--accent-cyan)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
          >
            {t("playOnline")}
          </button>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 self-center" data-id="home-footer-actions">
        <button
          data-id="reset-browser-data-button"
          onClick={resetBrowserData}
          className="rounded-lg border border-gray-500 bg-transparent px-4 py-2 text-sm font-medium text-gray-400 transition hover:border-gray-400 hover:text-gray-300 active:scale-95"
        >
          Reset
        </button>
        <span className="text-sm font-medium text-gray-500" data-id="app-version-label">
          V0.8.1
        </span>
      </div>
    </main>
  );
}
