"use client";

import Link from "next/link";
import { useState } from "react";
import { fillWithBots, joinGame, startGame } from "@/lib/server/actions-lobby";
import type { GameView } from "@/lib/server/view";

export function Lobby({ gv, onChange }: { gv: GameView; onChange: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seats = [0, 1, 2, 3];
  const bySeat = new Map(gv.players.map((p) => [p.seat, p]));
  const full = gv.players.length === 4;
  const isMember = gv.mySeat !== null;

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="lobby-screen">
      <Link href="/" className="text-sm text-emerald-200/70" data-id="lobby-back">
        ← Accueil
      </Link>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-emerald-100/60">Code de la partie</p>
        <p className="text-4xl font-black tracking-[0.3em] text-emerald-300" data-id="lobby-room-code">
          {gv.roomCode}
        </p>
        <p className="mt-1 text-xs text-emerald-100/60">
          Objectif {gv.settings.targetPoints} · bots {gv.settings.botDifficulty}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/20 px-4 py-2 text-center text-sm text-rose-200" data-id="lobby-error">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3" data-id="lobby-seats">
        {seats.map((seat) => {
          const player = bySeat.get(seat);
          return (
            <li
              key={seat}
              data-id={`lobby-seat-${seat}`}
              className={`rounded-xl px-4 py-3 ring-1 ${
                player ? "bg-felt-dark/70 ring-emerald-300/20" : "bg-black/20 ring-white/5"
              }`}
            >
              <p className="text-xs text-emerald-100/50">
                Siège {seat + 1} · équipe {seat % 2 === 0 ? "A" : "B"}
              </p>
              <p className="font-bold">
                {player ? player.displayName : "Libre"}
                {player?.isBot && <span className="ml-1 text-xs text-amber-300">bot</span>}
                {seat === gv.mySeat && <span className="ml-1 text-xs text-emerald-300">(vous)</span>}
              </p>
            </li>
          );
        })}
      </ul>

      {!isMember ? (
        <div className="flex gap-3">
          <input
            data-id="lobby-join-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre pseudo"
            className="flex-1 rounded-lg bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-300"
          />
          <button
            data-id="lobby-join-button"
            disabled={busy || full}
            onClick={() => act(() => joinGame({ roomCode: gv.roomCode, displayName: name }))}
            className="rounded-lg bg-sky-400 px-4 py-2 font-bold text-sky-950 disabled:opacity-50"
          >
            Rejoindre
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            data-id="lobby-fill-bots"
            disabled={busy || full}
            onClick={() => act(() => fillWithBots(gv.gameId))}
            className="rounded-lg bg-white/10 px-4 py-3 font-bold disabled:opacity-40"
          >
            Remplir avec des bots
          </button>
          <button
            data-id="lobby-start-button"
            disabled={busy || !full}
            onClick={() => act(() => startGame(gv.gameId))}
            className="rounded-lg bg-emerald-400 px-4 py-3 font-bold text-emerald-950 disabled:opacity-40"
          >
            {full ? "Démarrer la partie" : "En attente de 4 joueurs"}
          </button>
        </div>
      )}
    </main>
  );
}
