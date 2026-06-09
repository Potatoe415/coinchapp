"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createGame, joinGame } from "@/lib/server/actions-lobby";
import { ensureAnonAuth } from "@/lib/client/auth";
import type { Difficulty } from "@/lib/coinche";

const TARGETS = [500, 1000, 1500, 2000];
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Moyen" },
  { value: "hard", label: "Difficile" },
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState(1000);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ gameId: string }>) {
    setBusy(true);
    setError(null);
    try {
      await ensureAnonAuth();
      const { gameId } = await action();
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8" data-id="home-screen">
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-emerald-300">Coinche</h1>
        <p className="text-sm text-emerald-100/70">Jouez à 4 en ligne, ou contre des bots.</p>
      </header>

      {error && (
        <p className="rounded-lg bg-rose-500/20 px-4 py-2 text-center text-sm text-rose-200" data-id="home-error">
          {error}
        </p>
      )}

      <section className="rounded-2xl bg-felt-dark/60 p-5 shadow-lg ring-1 ring-emerald-300/10" data-id="create-game-card">
        <h2 className="mb-3 text-lg font-bold">Nouvelle partie</h2>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-emerald-100/70">Votre pseudo</span>
          <input
            data-id="create-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pseudo"
            className="w-full rounded-lg bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-300"
          />
        </label>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-emerald-100/70">Objectif</span>
            <select
              data-id="create-target-select"
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
              data-id="create-difficulty-select"
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
        <button
          data-id="create-game-button"
          disabled={busy}
          onClick={() => run(() => createGame({ displayName: name, settings: { targetPoints: target, botDifficulty: difficulty } }))}
          className="w-full rounded-lg bg-emerald-400 px-4 py-3 font-bold text-emerald-950 disabled:opacity-50"
        >
          Créer la partie
        </button>
      </section>

      <section className="rounded-2xl bg-felt-dark/60 p-5 shadow-lg ring-1 ring-emerald-300/10" data-id="join-game-card">
        <h2 className="mb-3 text-lg font-bold">Rejoindre</h2>
        <div className="flex gap-3">
          <input
            data-id="join-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={6}
            className="w-32 rounded-lg bg-black/30 px-3 py-2 text-center font-mono text-lg tracking-widest outline-none ring-1 ring-white/10 focus:ring-emerald-300"
          />
          <button
            data-id="join-game-button"
            disabled={busy || code.length < 3}
            onClick={() => run(() => joinGame({ roomCode: code, displayName: name }))}
            className="flex-1 rounded-lg bg-sky-400 px-4 py-3 font-bold text-sky-950 disabled:opacity-50"
          >
            Rejoindre
          </button>
        </div>
      </section>
    </main>
  );
}
