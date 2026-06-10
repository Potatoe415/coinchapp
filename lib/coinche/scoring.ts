import { cardPoints, teamOf } from "./cards";
import type { Card, DealResult, GameState, ScoringRules, Suit, Team } from "./types";

/** Bid identifier for capot — never changes regardless of scoring rules. */
const CAPOT_VALUE = 250;
const GENERALE_VALUE = 500;
const FULL_DECK_POINTS = 160;

function otherTeam(team: Team): Team {
  return team === "A" ? "B" : "A";
}

/** Team holding both K and Q of trump, or null. */
export function detectBelote(hands: Card[][], trump: Suit | null): Team | null {
  if (!trump) return null;
  for (let seat = 0; seat < 4; seat++) {
    const hand = hands[seat];
    const hasKing = hand.some((c) => c.suit === trump && c.rank === "K");
    const hasQueen = hand.some((c) => c.suit === trump && c.rank === "Q");
    if (hasKing && hasQueen) return teamOf(seat as 0 | 1 | 2 | 3);
  }
  return null;
}

/** Card points won by each team across all tricks, including the 10 de der. */
function cardPointsByTeam(state: GameState): { A: number; B: number } {
  const points: { A: number; B: number } = { A: 0, B: 0 };
  state.tricks.forEach((trick, index) => {
    const team = teamOf(trick.winner!);
    for (const played of trick.cards) {
      points[team] += cardPoints(played.card, state.trump);
    }
    if (index === state.tricks.length - 1) points[team] += 10;
  });
  return points;
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
  const beloteAtt = state.belote.team === att ? 20 : 0;
  const beloteDef = state.belote.team === def ? 20 : 0;
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

/** Apply the deal result to the match score and decide if the game is over. */
export function finalizeDeal(state: GameState): GameState {
  const result = computeDealResult(state);
  const scores = {
    A: state.scores.A + result.gained.A,
    B: state.scores.B + result.gained.B,
  };
  const reached = scores.A >= state.targetPoints || scores.B >= state.targetPoints;
  let winner: Team | undefined;
  if (reached) {
    if (scores.A === scores.B) {
      winner = result.contractMade ? result.contract.team : otherTeam(result.contract.team);
    } else {
      winner = scores.A > scores.B ? "A" : "B";
    }
  }
  return {
    ...state,
    scores,
    lastDeal: result,
    phase: winner ? "finished" : "scoring",
    winner,
  };
}
