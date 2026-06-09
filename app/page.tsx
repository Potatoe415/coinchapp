"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Difficulty } from "@/lib/coinche";

const TARGETS = [500, 1000, 1500, 2000];
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Moyen" },
  { value: "hard", label: "Difficile" },
];

export default function Home() {
  const router = useRouter();
  const [target, setTarget] = useState(1000);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  function playLocal() {
    router.push(`/local?target=${target}&difficulty=${difficulty}`);
  }

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
          .map((database) => database.name)
          .filter((name): name is string => Boolean(name))
          .map((name) => {
            return new Promise<void>((resolve) => {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            });
          }),
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="home-screen">
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-emerald-300">Coinche</h1>
        <p className="text-sm text-emerald-100/70">Jouez en local contre des bots, ou à 4 en ligne.</p>
      </header>

      <button
        data-id="play-local-button"
        onClick={playLocal}
        className="rounded-2xl bg-emerald-400 px-4 py-4 text-lg font-black text-emerald-950 shadow-lg"
      >
        Jouer en local
        <span className="mt-0.5 block text-xs font-medium text-emerald-900/80">
          Hors-ligne, contre 3 bots
        </span>
      </button>

      <button
        data-id="play-online-button"
        onClick={() => router.push(`/online?target=${target}&difficulty=${difficulty}`)}
        className="rounded-2xl bg-sky-400 px-4 py-4 text-lg font-black text-sky-950 shadow-lg"
      >
        Jouer en ligne
      </button>

      <button
        data-id="open-settings-button"
        onClick={() => setShowSettingsModal(true)}
        className="rounded-2xl bg-white/10 px-4 py-4 text-lg font-black text-white shadow-lg ring-1 ring-white/15"
      >
        Paramètres
      </button>

      <button
        data-id="reset-browser-data-button"
        onClick={resetBrowserData}
        className="mt-auto self-center rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/55 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white/70"
      >
        Reset
      </button>

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" data-id="settings-modal-overlay">
          <section
            className="w-full max-w-sm rounded-2xl bg-felt-dark p-5 shadow-2xl ring-1 ring-emerald-300/20"
            data-id="settings-modal"
          >
            <h2 className="mb-4 text-lg font-bold">Paramètres</h2>
            <div className="grid gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-emerald-100/70">Nombre de points</span>
                <select
                  data-id="settings-target-select"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/30 px-3 py-2 ring-1 ring-white/10"
                >
                  {TARGETS.map((t) => (
                    <option key={t} value={t}>
                      {t} points
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-emerald-100/70">Bots</span>
                <select
                  data-id="settings-difficulty-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full rounded-lg bg-black/30 px-3 py-2 ring-1 ring-white/10"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                data-id="settings-close-button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg bg-white/10 px-4 py-2 font-bold"
              >
                Fermer
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
