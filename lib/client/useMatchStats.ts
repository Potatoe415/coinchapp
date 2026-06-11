"use client";

import { useCallback, useEffect, useState } from "react";
import type { DealResult, PlayerView, Seat } from "@/lib/coinche";

// ─── Internal storage shape ───────────────────────────────────────────────────

interface SeatAccum {
  passCount: number;
  coinsCount: number;
  contractCount: number;
  trick8Count: number;
  contractSuccess: number;
  contractTotal: number;
}

interface StoredStats {
  /** Fingerprint of the last deal already processed, preventing double-counting. */
  lastFingerprint: string;
  seats: Record<Seat, SeatAccum>;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SeatStats {
  /** "Le Froussard" raw count: number of PASS actions. */
  froussard: number;
  /** "Le Chien Fou" raw count: COINCHE + SURCOINCHE actions. */
  chienFou: number;
  /** "Le Dictateur" raw count: times this seat took the contract. */
  dictateur: number;
  /** "Le Gardien du Temple" raw count: times this seat won the 8th trick. */
  gardien: number;
  /** "Fiabilité": successful vs total contracts taken. */
  reliability: { success: number; total: number };
}

export interface FunnyAward {
  id: string;
  /** French award name shown in the UI. */
  label: string;
  /** One-line French description. */
  description: string;
  /** Seat that wins this award, or null if no one qualifies yet. */
  winner: Seat | null;
  /** Formatted score string per seat (e.g. "3" or "2/5"). */
  scores: Record<Seat, string>;
}

export interface MatchStatsResult {
  /** Raw accumulated stats per seat, useful for custom rendering. */
  bySeat: Record<Seat, SeatStats>;
  /** The 5 funny awards, each with a winner and per-seat scores. */
  awards: FunnyAward[];
  /** Wipe localStorage and reset in-memory state (call when the full match ends). */
  clearStats: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEATS = [0, 1, 2, 3] as const;

function zeroAccum(): SeatAccum {
  return {
    passCount: 0,
    coinsCount: 0,
    contractCount: 0,
    trick8Count: 0,
    contractSuccess: 0,
    contractTotal: 0,
  };
}

function emptyStorage(): StoredStats {
  return {
    lastFingerprint: "",
    seats: { 0: zeroAccum(), 1: zeroAccum(), 2: zeroAccum(), 3: zeroAccum() },
  };
}

/** Create an object keyed by all four seats from a per-seat factory. */
function seatRecord<V>(fn: (s: Seat) => V): Record<Seat, V> {
  return { 0: fn(0), 1: fn(1), 2: fn(2), 3: fn(3) };
}

/** Lightweight fingerprint to detect a new (unprocessed) deal result. */
function dealFingerprint(deal: DealResult): string {
  return `${deal.contract.seat}:${deal.contract.value}:${deal.contract.suit}:${deal.cardPoints.A}:${deal.cardPoints.B}:${deal.contractMade}`;
}

function loadStored(key: string): StoredStats {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as StoredStats;
  } catch {
    // Quota error or corrupt JSON — start fresh.
  }
  return emptyStorage();
}

/** Return the seat with the highest mapper value, or null if no seat exceeds zero. */
function argMaxBy(mapper: (s: Seat) => number): Seat | null {
  let best: Seat | null = null;
  let bestVal = 0;
  for (const seat of SEATS) {
    const v = mapper(seat);
    if (v > bestVal) {
      bestVal = v;
      best = seat;
    }
  }
  return best;
}

// ─── Round accumulation (pure) ────────────────────────────────────────────────

function accumulate(stored: StoredStats, view: PlayerView): StoredStats {
  const { lastDeal, bids, tricks } = view;
  if (!lastDeal) return stored;

  const fp = dealFingerprint(lastDeal);
  if (stored.lastFingerprint === fp) return stored;

  const seats: Record<Seat, SeatAccum> = seatRecord(s => ({ ...stored.seats[s] }));

  for (const bid of bids) {
    if (bid.type === "pass") {
      seats[bid.seat].passCount++;
    } else if (bid.type === "coinche" || bid.type === "surcoinche") {
      seats[bid.seat].coinsCount++;
    }
  }

  // The seat that took the final contract drives both Le Dictateur and Fiabilité.
  const dictSeat = lastDeal.contract.seat;
  seats[dictSeat].contractCount++;
  seats[dictSeat].contractTotal++;
  if (lastDeal.contractMade) seats[dictSeat].contractSuccess++;

  // 8th trick (0-indexed): the "dix de der" trick.
  const trick8 = tricks[7];
  if (trick8?.winner !== undefined) seats[trick8.winner].trick8Count++;

  return { lastFingerprint: fp, seats };
}

// ─── Award derivation (pure) ──────────────────────────────────────────────────

function buildAwards(seats: Record<Seat, SeatAccum>): FunnyAward[] {
  const relPct = (s: SeatAccum): number =>
    s.contractTotal === 0 ? -1 : s.contractSuccess / s.contractTotal;

  const relLabel = (s: SeatAccum): string =>
    s.contractTotal === 0 ? "–" : `${s.contractSuccess}/${s.contractTotal}`;

  return [
    {
      id: "froussard",
      label: "Le Froussard",
      description: "Celui qui dit « passe » le plus souvent",
      winner: argMaxBy(s => seats[s].passCount),
      scores: seatRecord(s => String(seats[s].passCount)),
    },
    {
      id: "chienFou",
      label: "Le Chien Fou",
      description: "Le roi de la coinche et de la surcoinche",
      winner: argMaxBy(s => seats[s].coinsCount),
      scores: seatRecord(s => String(seats[s].coinsCount)),
    },
    {
      id: "dictateur",
      label: "Le Dictateur",
      description: "Celui qui prend le plus souvent le contrat",
      winner: argMaxBy(s => seats[s].contractCount),
      scores: seatRecord(s => String(seats[s].contractCount)),
    },
    {
      id: "gardien",
      label: "Le Gardien du Temple",
      description: "Maître du 8ème pli le plus souvent",
      winner: argMaxBy(s => seats[s].trick8Count),
      scores: seatRecord(s => String(seats[s].trick8Count)),
    },
    {
      id: "fiabilite",
      label: "Fiabilité",
      description: "Meilleur taux de réussite quand on prend le contrat",
      winner: argMaxBy(s => relPct(seats[s])),
      scores: seatRecord(s => relLabel(seats[s])),
    },
  ];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Accumulates per-round statistics across a full Coinche match and derives
 * 5 funny end-of-match awards. Persists running totals to localStorage so
 * they survive round resets. Treats `view` as strictly read-only.
 *
 * @param gameId  Stable identifier used as the localStorage namespace key.
 * @param view    The current redacted PlayerView from the server (or null).
 */
export function useMatchStats(gameId: string, view: PlayerView | null): MatchStatsResult {
  const storageKey = `coinche_match_stats_${gameId}`;

  const [accum, setAccum] = useState<StoredStats>(() => {
    if (typeof window === "undefined") return emptyStorage();
    return loadStored(storageKey);
  });

  // Capture round data the moment a deal transitions to scoring/finished.
  // The fingerprint check inside `accumulate` prevents double-processing.
  useEffect(() => {
    if (!view) return;
    if (view.phase !== "scoring" && view.phase !== "finished") return;
    if (!view.lastDeal) return;

    setAccum(prev => {
      const next = accumulate(prev, view);
      if (next === prev) return prev;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore quota errors — in-memory state is still correct.
      }
      return next;
    });
  }, [view, storageKey]);

  const clearStats = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore.
    }
    setAccum(emptyStorage());
  }, [storageKey]);

  const bySeat = seatRecord(seat => ({
    froussard: accum.seats[seat].passCount,
    chienFou: accum.seats[seat].coinsCount,
    dictateur: accum.seats[seat].contractCount,
    gardien: accum.seats[seat].trick8Count,
    reliability: {
      success: accum.seats[seat].contractSuccess,
      total: accum.seats[seat].contractTotal,
    },
  }));

  const awards = buildAwards(accum.seats);

  return { bySeat, awards, clearStats };
}
