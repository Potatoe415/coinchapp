"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/client/i18n";
import { RulesModal } from "@/components/RulesModal";

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

  window.location.reload();
}

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const [showRules, setShowRules] = useState(false);

  return (
    <main
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between overflow-hidden"
      data-id="home-screen"
      style={{
        backgroundImage: "url('/splashscreen.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >

      <div className="relative z-10 flex w-full flex-col items-center gap-3 px-6 pt-[25vh]" data-id="splash-actions">
        <button
          data-id="play-local-button"
          onClick={() => router.push("/local")}
          className="w-full rounded-2xl bg-[var(--accent-yellow)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
        >
          {t("playLocal")}
          <span className="mt-0.5 block text-xs font-medium text-[var(--surface)]/80">
            {t("localOfflineNote")}
          </span>
        </button>

        <button
          data-id="play-online-button"
          onClick={() => router.push("/online?target=1000")}
          className="w-full rounded-2xl bg-[var(--accent-cyan)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
        >
          {t("playOnline")}
        </button>
      </div>

      <div className="relative z-10 mt-auto mb-4 flex items-center gap-3 self-center" data-id="home-footer-actions">
        <button
          data-id="reset-browser-data-button"
          onClick={resetBrowserData}
          className="rounded-lg border border-white/40 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/60 hover:text-white/90 active:scale-95"
        >
          Reset
        </button>
        <button
          data-id="rules-button"
          onClick={() => setShowRules(true)}
          className="rounded-lg border border-white/40 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/60 hover:text-white/90 active:scale-95"
        >
          {t("rulesButton")}
        </button>
        <span className="text-sm font-medium text-white/60" data-id="app-version-label">
          V0.8.3
        </span>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </main>
  );
}
