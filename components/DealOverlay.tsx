"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlayerView } from "@/lib/coinche";
import { formatContract } from "./labels";

export function DealOverlay({
  view,
  onNextDeal,
}: {
  view: PlayerView;
  onNextDeal: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const result = view.lastDeal;
  const finished = view.phase === "finished";
  if (!result && !finished) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6" data-id="deal-overlay">
      <div className="w-full max-w-sm rounded-2xl bg-felt-dark p-6 text-center ring-1 ring-emerald-300/20">
        {finished ? (
          <>
            <h2 className="text-2xl font-black text-emerald-300" data-id="game-winner">
              Équipe {view.winner} gagne !
            </h2>
            <p className="mt-2 text-emerald-100/80">
              Score final {view.scores.A} – {view.scores.B}
            </p>
            <Link
              href="/"
              data-id="finished-home-button"
              className="mt-5 inline-block rounded-lg bg-emerald-400 px-5 py-2.5 font-bold text-emerald-950"
            >
              Nouvelle partie
            </Link>
          </>
        ) : (
          result && (
            <>
              <h2 className="text-xl font-black">Fin de la donne</h2>
              <p className="mt-1 text-sm text-emerald-100/70">
                Contrat {formatContract(result.contract)} par l’équipe {result.contract.team}
              </p>
              <p className={`mt-2 font-bold ${result.contractMade ? "text-emerald-300" : "text-rose-300"}`}>
                {result.contractMade ? "Contrat réussi" : "Contrat chuté"}
                {result.capot && " · Capot"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <ScoreCell team="A" gained={result.gained.A} total={view.scores.A} />
                <ScoreCell team="B" gained={result.gained.B} total={view.scores.B} />
              </div>
              <button
                data-id="next-deal-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onNextDeal();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-5 w-full rounded-lg bg-emerald-400 px-5 py-2.5 font-bold text-emerald-950 disabled:opacity-50"
              >
                Donne suivante
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}

function ScoreCell({ team, gained, total }: { team: "A" | "B"; gained: number; total: number }) {
  return (
    <div className="rounded-lg bg-black/30 py-2" data-id={`deal-score-${team}`}>
      <p className="text-xs text-emerald-100/60">Équipe {team}</p>
      <p className="text-lg font-bold">+{gained}</p>
      <p className="text-xs text-emerald-100/60">total {total}</p>
    </div>
  );
}
