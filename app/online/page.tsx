"use client";

import Link from "next/link";
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
const ROOM_CODE_LENGTH = 3;

export default function OnlinePage() {
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="online-screen">
      <Link href="/" className="text-sm text-emerald-200/70" data-id="online-back-home">
        ← Retour au dashboard
      </Link>

      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-emerald-300">Jouer en ligne</h1>
        <p className="text-sm text-emerald-100/70">Créez une partie ou rejoignez une room existante.</p>
      </header>

      {error && (
        <p className="rounded-lg bg-rose-500/20 px-4 py-2 text-center text-sm text-rose-200" data-id="online-error">
          {error}
        </p>
      )}

      <section className="rounded-2xl bg-felt-dark/60 p-5 shadow-lg ring-1 ring-emerald-300/10" data-id="online-settings-card">
        <h2 className="mb-3 text-lg font-bold">Paramètres de partie</h2>
        <div className="grid gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-emerald-100/70">Nombre de points</span>
            <select
              data-id="online-target-select"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full rounded-lg bg-black/30 px-3 py-2 ring-1 ring-white/10"
            >
              {TARGETS.map((points) => (
                <option key={points} value={points}>
                  {points} points
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-emerald-100/70">Bots</span>
            <select
              data-id="online-difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded-lg bg-black/30 px-3 py-2 ring-1 ring-white/10"
            >
              {DIFFICULTIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-felt-dark/60 p-5 shadow-lg ring-1 ring-emerald-300/10" data-id="online-actions-card">
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-emerald-100/70">Votre pseudo</span>
          <input
            data-id="online-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pseudo"
            className="w-full rounded-lg bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-300"
          />
        </label>
        <button
          data-id="create-game-button"
          disabled={busy}
          onClick={() =>
            run(() => createGame({ displayName: name, settings: { targetPoints: target, botDifficulty: difficulty } }))
          }
          className="mb-4 w-full rounded-lg bg-sky-400 px-4 py-3 font-bold text-sky-950 disabled:opacity-50"
        >
          Créer partie en ligne
        </button>
        <div className="flex gap-3">
          <input
            data-id="join-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH))}
            placeholder="CODE"
            maxLength={ROOM_CODE_LENGTH}
            className="w-32 rounded-lg bg-black/30 px-3 py-2 text-center font-mono text-lg tracking-widest outline-none ring-1 ring-white/10 focus:ring-emerald-300"
          />
          <button
            data-id="join-game-button"
            disabled={busy || code.length !== ROOM_CODE_LENGTH}
            onClick={() => run(() => joinGame({ roomCode: code, displayName: name }))}
            className="flex-1 rounded-lg bg-white/10 px-4 py-3 font-bold disabled:opacity-50"
          >
            Rejoindre
          </button>
        </div>
      </section>
    </main>
  );
}
