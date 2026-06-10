import { cardPoints, teamOf } from "./cards";
import type { BeloteState, Card, DealResult, GameState, ScoringRules, Suit, Team, TrumpMode } from "./types";

/** Bid identifier for capot — never changes regardless of scoring rules. */
const CAPOT_VALUE = 250;
const GENERALE_VALUE = 500;
const FULL_DECK_POINTS = 160;
/** Reference total used for all bids/contracts (152 card + 10 de der). */
const REFERENCE_TOTAL = 162;

function otherTeam(team: Team): Team {
  return team === "A" ? "B" : "A";
}

/** Suits that carry trump-order belote for the given mode. */
function beloteSuits(trump: TrumpMode | null): Suit[] {
  if (trump === null || trump === "SA") return [];
  if (trump === "TA") return ["H", "D", "C", "S"];
  return [trump];
}

/** Seat holding both K and Q of a suit, or -1. */
function beloteHolder(hands: Card[][], suit: Suit): number {
  for (let seat = 0; seat < 4; seat++) {
    const hand = hands[seat];
    const hasKing = hand.some((c) => c.suit === suit && c.rank === "K");
    const hasQueen = hand.some((c) => c.suit === suit && c.rank === "Q");
    if (hasKing && hasQueen) return seat;
  }
  return -1;
}

/** Team holding both K and Q of the single trump suit, or null. */
export function detectBelote(hands: Card[][], trump: TrumpMode | null): Team | null {
  if (trump === null || trump === "TA" || trump === "SA") return null;
  const seat = beloteHolder(hands, trump);
  return seat >= 0 ? teamOf(seat as 0 | 1 | 2 | 3) : null;
}

/** Belote state for a deal: per-team points (20 per K+Q pair) plus the single-suit holder.
 *  In tout atout every suit's pair counts, so a team may collect several belotes. */
export function computeBelote(hands: Card[][], trump: TrumpMode | null): BeloteState {
  const points = { A: 0, B: 0 };
  let team: Team | null = null;
  for (const suit of beloteSuits(trump)) {
    const seat = beloteHolder(hands, suit);
    if (seat < 0) continue;
    const holder = teamOf(seat as 0 | 1 | 2 | 3);
    points[holder] += 20;
    if (trump !== "TA") team = holder;
  }
  return { team, points, announced: [] };
}

/** Raw total points distributed in a deal for the mode (card points + 10 de der). */
function modeRawTotal(trump: TrumpMode | null): number {
  return trump === "TA" ? 214 : REFERENCE_TOTAL;
}

/** Card points won by each team, including the 10 de der, normalized to the /162 scale. */
function cardPointsByTeam(state: GameState): { A: number; B: number } {
  const raw: { A: number; B: number } = { A: 0, B: 0 };
  state.tricks.forEach((trick, index) => {
    const team = teamOf(trick.winner!);
    for (const played of trick.cards) {
      raw[team] += cardPoints(played.card, state.trump);
    }
    if (index === state.tricks.length - 1) raw[team] += 10;
  });
  const total = modeRawTotal(state.trump);
  if (total === REFERENCE_TOTAL) return raw;
  const factor = REFERENCE_TOTAL / total;
  return { A: Math.round(raw.A * factor), B: Math.round(raw.B * factor) };
}

function tricksWonBy(state: GameState, team: Team): number {
  return state.tricks.filter((t) => teamOf(t.winner!) === team).length;
}

function tricksWonBySeat(state: GameState, seat: 0 | 1 | 2 | 3): number {
  return state.tricks.filter((t) => t.winner === seat).length;
}

function isGenerale(state: GameState, team: Team): boolean {
  const seats: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3] = team === "A" ? [0, 2] : [1, 3];
  return seats.some((seat) => tricksWonBySeat(state, seat) === 8);
}

function scoreAnnouncedCapot(
  made: boolean,
  mult: number,
  beloteAtt: number,
  beloteDef: number,
  rules: Pick<ScoringRules, "capotMadePoints" | "capotFailedDefensePoints">,
): { att: number; def: number } {
  if (mult === 1) {
    return made
      ? { att: rules.capotMadePoints + beloteAtt, def: beloteDef }
      : { att: beloteAtt, def: rules.capotFailedDefensePoints + beloteDef };
  }
  return made
    ? { att: rules.capotMadePoints * mult + beloteAtt, def: beloteDef }
    : { att: beloteAtt, def: rules.capotFailedDefensePoints * mult + beloteDef };
}

function scoreAnnouncedGenerale(
  made: boolean,
  mult: number,
  beloteAtt: number,
  beloteDef: number,
): { att: number; def: number } {
  const base = FULL_DECK_POINTS + GENERALE_VALUE; // 660
  if (mult === 1) {
    return made
      ? { att: GENERALE_VALUE * 2 + beloteAtt, def: beloteDef }
      : { att: beloteAtt, def: base + beloteDef };
  }
  return made
    ? { att: base * mult + beloteAtt, def: beloteDef }
    : { att: beloteAtt, def: base * mult + beloteDef };
}

function scoreContract(
  C: number,
  made: boolean,
  mult: number,
  realizedAtt: number,
  realizedDef: number,
  beloteAtt: number,
  beloteDef: number,
  rules: ScoringRules,
): { att: number; def: number } {
  const attackingPointsIfMade = rules.countContractOnlyIfMade ? C : C + realizedAtt;
  const defendingPointsIfMade = rules.zeroPointsForNonContractingTeamWhenContractMade ? 0 : realizedDef;
  const defendingPointsIfFailed = Math.max(0, Math.floor(rules.failedContractDefensePoints));

  if (mult === 1) {
    return made
      ? { att: attackingPointsIfMade + beloteAtt, def: defendingPointsIfMade + beloteDef }
      : { att: beloteAtt, def: defendingPointsIfFailed + beloteDef };
  }
  const base = defendingPointsIfFailed;
  return made
    ? {
        att: (rules.countContractOnlyIfMade ? C * mult : base * mult) + beloteAtt,
        def: beloteDef,
      }
    : { att: beloteAtt, def: base * mult + beloteDef };
}

/** Compute the result of a finished deal (8 tricks played). */
export function computeDealResult(state: GameState): DealResult {
  const contract = state.contract!;
  const att = contract.team;
  const def = otherTeam(att);
  const cp = cardPointsByTeam(state);
  const capot = tricksWonBy(state, att) === 8;
  const generale = isGenerale(state, att);
  const beloteAtt = state.belote.points[att];
  const beloteDef = state.belote.points[def];
  const realizedAtt = capot ? state.scoringRules.capotMadePoints : cp[att];

  let made: boolean;
  let scored: { att: number; def: number };
  if (contract.value === GENERALE_VALUE) {
    made = generale;
    scored = scoreAnnouncedGenerale(made, contract.coinche, beloteAtt, beloteDef);
  } else if (contract.value === CAPOT_VALUE) {
    made = capot;
    scored = scoreAnnouncedCapot(made, contract.coinche, beloteAtt, beloteDef, state.scoringRules);
  } else {
    made = realizedAtt + beloteAtt >= contract.value;
    scored = scoreContract(
      contract.value,
      made,
      contract.coinche,
      realizedAtt,
      cp[def],
      beloteAtt,
      beloteDef,
      state.scoringRules,
    );
  }

  const gained = { A: 0, B: 0 };
  gained[att] = scored.att;
  gained[def] = scored.def;
  return {
    contract,
    cardPoints: cp,
    belote: state.belote.team,
    capot,
    contractMade: made,
    gained,
  };
}

/** Decide the match winner once the target is reached, or undefined to keep playing. */
function decideWinner(
  scores: { A: number; B: number },
  target: number,
  rules: ScoringRules,
  result: DealResult,
): Team | undefined {
  if (scores.A < target && scores.B < target) return undefined;
  if (scores.A !== scores.B) return scores.A > scores.B ? "A" : "B";
  // Exact tie at/above the target.
  if (rules.requireMorePointsToWin) return undefined;
  return result.contractMade ? result.contract.team : otherTeam(result.contract.team);
}

/** Apply the deal result to the match score and decide if the game is over. */
export function finalizeDeal(state: GameState): GameState {
  const result = computeDealResult(state);
  const scores = {
    A: state.scores.A + result.gained.A,
    B: state.scores.B + result.gained.B,
  };
  const winner = decideWinner(scores, state.targetPoints, state.scoringRules, result);
  return {
    ...state,
    scores,
    lastDeal: result,
    phase: winner ? "finished" : "scoring",
    winner,
  };
}
