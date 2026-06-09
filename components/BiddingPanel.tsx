"use client";

import { useState } from "react";
import { placeBid } from "@/lib/server/actions-game";
import type { BidOptions, Suit } from "@/lib/coinche";
import { SUIT_SYMBOL, isRedSuit } from "./labels";

const SUITS: Suit[] = ["H", "D", "C", "S"];

function valueChoices(min: number): number[] {
  const values: number[] = [];
  for (let v = min; v <= 160; v += 10) values.push(v);
  values.push(250);
  return values;
}

export function BiddingPanel({ gameId, options }: { gameId: string; options: BidOptions }) {
  const [value, setValue] = useState(options.minValue ?? 80);
  const [busy, setBusy] = useState(false);

  async function send(payload: Parameters<typeof placeBid>[1]) {
    setBusy(true);
    try {
      await placeBid(gameId, payload);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3" data-id="bidding-panel">
      {options.minValue !== null && (
        <>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-emerald-100/70">Annonce</span>
            <select
              data-id="bid-value-select"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="rounded-lg bg-black/40 px-3 py-2 font-bold ring-1 ring-white/10"
            >
              {valueChoices(options.minValue).map((v) => (
                <option key={v} value={v}>
                  {v === 250 ? "Capot" : v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center gap-2">
            {SUITS.map((suit) => (
              <button
                key={suit}
                data-id={`bid-suit-${suit}`}
                disabled={busy}
                onClick={() => send({ type: "bid", value, suit })}
                className={`h-12 w-12 rounded-lg bg-white text-2xl font-bold disabled:opacity-50 ${
                  isRedSuit(suit) ? "text-rose-600" : "text-neutral-900"
                }`}
              >
                {SUIT_SYMBOL[suit]}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="flex justify-center gap-2">
        {options.canPass && (
          <button
            data-id="bid-pass-button"
            disabled={busy}
            onClick={() => send({ type: "pass" })}
            className="rounded-lg bg-white/10 px-5 py-2 font-bold disabled:opacity-50"
          >
            Passer
          </button>
        )}
        {options.canCoinche && (
          <button
            data-id="bid-coinche-button"
            disabled={busy}
            onClick={() => send({ type: "coinche" })}
            className="rounded-lg bg-amber-400 px-5 py-2 font-bold text-amber-950 disabled:opacity-50"
          >
            Coincher
          </button>
        )}
        {options.canSurcoinche && (
          <button
            data-id="bid-surcoinche-button"
            disabled={busy}
            onClick={() => send({ type: "surcoinche" })}
            className="rounded-lg bg-rose-400 px-5 py-2 font-bold text-rose-950 disabled:opacity-50"
          >
            Surcoincher
          </button>
        )}
      </div>
    </div>
  );
}
