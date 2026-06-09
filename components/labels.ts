import type { Contract, Suit } from "@/lib/coinche";

export const SUIT_SYMBOL: Record<Suit, string> = {
  H: "\u2665",
  D: "\u2666",
  C: "\u2663",
  S: "\u2660",
};

export function isRedSuit(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

export function formatContract(contract: Contract | null): string {
  if (!contract) return "Pas de contrat";
  const value = contract.value === 250 ? "Capot" : `${contract.value}`;
  const mult = contract.coinche === 4 ? " x4" : contract.coinche === 2 ? " x2" : "";
  return `${value} ${SUIT_SYMBOL[contract.suit]}${mult}`;
}
