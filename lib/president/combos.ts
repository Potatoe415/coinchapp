import { cardId, outranks } from "./cards";
import type { Card, Combo, Pile, Rank } from "./types";

/** Every combo available in `hand`, grouped by rank - every sub-count of a
 *  group is its own combo too (e.g. 2 of 3 held 7s), not only the max. */
export function combosInHand(hand: Card[]): Combo[] {
  const byRank = new Map<Rank, Card[]>();
  for (const card of hand) {
    byRank.set(card.rank, [...(byRank.get(card.rank) ?? []), card]);
  }
  const combos: Combo[] = [];
  for (const [rank, cards] of byRank) {
    for (let count = 1; count <= cards.length; count++) {
      combos.push({ rank, cards: cards.slice(0, count) });
    }
  }
  return combos;
}

/** True if every card in `combo` is of `combo.rank`, distinct, and actually in
 *  `hand` - guards a client-submitted combo before trusting its shape. */
export function isValidComboShape(hand: Card[], combo: Combo): boolean {
  if (combo.cards.length === 0 || combo.cards.some((c) => c.rank !== combo.rank)) return false;
  const ids = new Set(combo.cards.map(cardId));
  if (ids.size !== combo.cards.length) return false;
  const handIds = new Set(hand.map(cardId));
  return combo.cards.every((c) => handIds.has(cardId(c)));
}

/** Legal to play `combo` onto `pile` right now: any count 1-4 when leading a
 *  freshly cleared pile, otherwise the same count as the pile's current
 *  requirement and a stronger rank. */
export function isLegalCombo(pile: Pile, revolution: boolean, combo: Combo): boolean {
  if (combo.cards.length < 1 || combo.cards.length > 4) return false;
  if (!pile.combo) return true;
  return combo.cards.length === pile.combo.cards.length && outranks(combo.rank, pile.combo.rank, revolution);
}
