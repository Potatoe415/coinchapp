"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { CAPOT_VALUE, GENERALE_VALUE, type BidOptions, type BidType, type TrumpMode } from "@/lib/coinche";
import { SUIT_SYMBOL, isRedSuit, trumpModeLabel } from "./labels";

function isSuitMode(mode: TrumpMode): mode is "H" | "D" | "C" | "S" {
  return mode !== "TA" && mode !== "SA";
}

export type BidPayload = { type: BidType; value?: number; suit?: TrumpMode };

function valueChoices(min: number): number[] {
  const values: number[] = [];
  for (let v = min; v <= 160; v += 10) values.push(v);
  values.push(CAPOT_VALUE, GENERALE_VALUE);
  return values;
}

function formatBidValue(value: number, t: (key: "capot" | "generale") => string): string {
  if (value === CAPOT_VALUE) return t("capot");
  if (value === GENERALE_VALUE) return t("generale");
  return String(value);
}

export function BiddingPanel({
  options,
  onBid,
  onSuitChange,
}: {
  options: BidOptions;
  onBid: (payload: BidPayload) => Promise<void> | void;
  onSuitChange?: (suit: TrumpMode | null) => void;
}) {
  const { t } = useI18n();
  const choices = useMemo(
    () => (options.minValue !== null ? valueChoices(options.minValue) : []),
    [options.minValue],
  );
  const [selectedValue, setSelectedValue] = useState(options.minValue ?? 80);
  const [selectedSuit, setSelectedSuit] = useState<TrumpMode | null>(null);
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
            <span className="text-sm text-[var(--card-face)]/70">{t("bid")}</span>
            <span className="text-2xl font-black text-[var(--accent-yellow)]" data-id="bid-value-display">
              {formatBidValue(value, t)}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {options.suits.map((mode) => (
              <button
                key={mode}
                data-id={`bid-suit-${mode}`}
                disabled={busy}
                onClick={() => { setSelectedSuit(mode); onSuitChange?.(mode); }}
                className={`h-12 w-12 rounded-lg font-bold disabled:opacity-50 transition-all ${
                  isSuitMode(mode) ? "text-2xl" : "text-base"
                } ${
                  isSuitMode(mode) && isRedSuit(mode) ? "text-[var(--accent-red)]" : "text-[var(--card-ink)]"
                } ${
                  selectedSuit === mode
                    ? "bg-[var(--card-face)] ring-2 ring-[var(--ring-strong)] scale-110"
                    : "bg-[var(--card-face)]/70"
                }`}
              >
                {isSuitMode(mode) ? SUIT_SYMBOL[mode] : trumpModeLabel(mode)}
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
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--accent-green)] to-[var(--accent-yellow)]"
            />
            <div className="mt-1 flex justify-between text-xs font-bold text-[var(--card-face)]/60">
              <span data-id="bid-slider-min">{choices[0] ?? options.minValue}</span>
              <span data-id="bid-slider-max">
                {choices[choices.length - 1] ? formatBidValue(choices[choices.length - 1], t) : options.minValue}
              </span>
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
            className="rounded-lg bg-[var(--card-face)]/14 px-5 py-2 font-bold disabled:opacity-50"
          >
            {t("pass")}
          </button>
        )}
        {options.minValue !== null && (
          <button
            data-id="bid-confirm-button"
            disabled={busy || selectedSuit === null}
            onClick={() => selectedSuit && send({ type: "bid", value, suit: selectedSuit })}
            className="rounded-lg bg-[var(--accent-green)] px-5 py-2 font-bold text-[var(--surface)] disabled:opacity-40"
          >
            {t("confirmBid")}
          </button>
        )}
        {options.canCoinche && (
          <button
            data-id="bid-coinche-button"
            disabled={busy}
            onClick={() => send({ type: "coinche" })}
            className="rounded-lg bg-[var(--accent-yellow)] px-5 py-2 font-bold text-[var(--surface)] disabled:opacity-50"
          >
            {t("coinche")}
          </button>
        )}
        {options.canSurcoinche && (
          <button
            data-id="bid-surcoinche-button"
            disabled={busy}
            onClick={() => send({ type: "surcoinche" })}
            className="rounded-lg bg-[var(--accent-red)] px-5 py-2 font-bold text-[var(--surface)] disabled:opacity-50"
          >
            {t("surcoinche")}
          </button>
        )}
      </div>
    </div>
  );
}
