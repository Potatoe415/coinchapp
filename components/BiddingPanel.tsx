"use client";

import { useMemo, useState } from "react";
import type { BidOptions, BidType, Suit } from "@/lib/coinche";
import { SUIT_SYMBOL, isRedSuit } from "./labels";

const SUITS: Suit[] = ["H", "D", "C", "S"];

export type BidPayload = { type: BidType; value?: number; suit?: Suit };

function valueChoices(min: number): number[] {
  const values: number[] = [];
  for (let v = min; v <= 160; v += 10) values.push(v);
  values.push(250);
  return values;
}

export function BiddingPanel({
  options,
  onBid,
}: {
  options: BidOptions;
  onBid: (payload: BidPayload) => Promise<void> | void;
}) {
  const choices = useMemo(
    () => (options.minValue !== null ? valueChoices(options.minValue) : []),
    [options.minValue],
  );
  const [selectedValue, setSelectedValue] = useState(options.minValue ?? 80);
  const [busy, setBusy] = useState(false);
  const value = choices.includes(selectedValue) ? selectedValue : (choices[0] ?? selectedValue);
  const sliderIndex = Math.max(0, choices.indexOf(value));

  async function send(payload: BidPayload) {
    setBusy(true);
    try {
      await onBid(payload);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3" data-id="bidding-panel">
      {options.minValue !== null && (
        <>
          <div className="flex flex-col items-center gap-1" data-id="bid-value-display-wrap">
            <span className="text-sm text-emerald-100/70">Annonce</span>
            <span className="text-2xl font-black text-emerald-200" data-id="bid-value-display">
              {value === 250 ? "Capot" : value}
            </span>
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
          <div className="px-1" data-id="bid-value-slider-wrap">
            <input
              type="range"
              data-id="bid-value-slider"
              min={0}
              max={Math.max(0, choices.length - 1)}
              step={1}
              value={sliderIndex}
              onChange={(e) => setSelectedValue(choices[Number(e.target.value)] ?? choices[0])}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300"
            />
            <div className="mt-1 flex justify-between text-xs font-bold text-emerald-100/60">
              <span data-id="bid-slider-min">{choices[0] ?? options.minValue}</span>
              <span data-id="bid-slider-max">{choices[choices.length - 1] === 250 ? "Capot" : choices[choices.length - 1]}</span>
            </div>
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
