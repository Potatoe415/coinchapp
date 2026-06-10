import type { Contract, Suit, TrumpMode } from "@/lib/coinche";
import type { Locale } from "@/lib/client/i18n";
import { CAPOT_VALUE, GENERALE_VALUE } from "@/lib/coinche";

export const SUIT_SYMBOL: Record<Suit, string> = {
  H: "\u2665",
  D: "\u2666",
  C: "\u2663",
  S: "\u2660",
};

export function isRedSuit(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

/** Short label/symbol for a trump mode (suit symbol, or TA/SA abbreviations). */
export function trumpModeLabel(mode: TrumpMode, locale: Locale = "fr"): string {
  if (mode === "TA") return locale === "fr" ? "TA" : "AT";
  if (mode === "SA") return "SA";
  return SUIT_SYMBOL[mode];
}

export function formatContract(contract: Contract | null, locale: Locale = "fr"): string {
  if (!contract) return locale === "fr" ? "Pas de contrat" : "No contract";
  const value =
    contract.value === CAPOT_VALUE
      ? "Capot"
      : contract.value === GENERALE_VALUE
        ? locale === "fr"
          ? "Générale"
          : "General"
        : `${contract.value}`;
  const mult = contract.coinche === 4 ? " x4" : contract.coinche === 2 ? " x2" : "";
  return `${value} ${trumpModeLabel(contract.suit, locale)}${mult}`;
}
