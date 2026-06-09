import { cardPoints, teamOf } from "./cards";
import type { Card, DealResult, GameState, Suit, Team } from "./types";

const CAPOT_VALUE = 250;
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

function scoreAnnouncedCapot(
  made: boolean,
  mult: number,
  beloteAtt: number,
  beloteDef: number,
): { att: number; def: number } {
  const base = FULL_DECK_POINTS + CAPOT_VALUE; // 410
  if (mult === 1) {
    return made
      ? { att: CAPOT_VALUE * 2 + beloteAtt, def: beloteDef }
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
): { att: number; def: number } {
  if (mult === 1) {
    return made
      ? { att: C + realizedAtt + beloteAtt, def: realizedDef + beloteDef }
      : { att: beloteAtt, def: FULL_DECK_POINTS + C + beloteDef };
  }
  const base = FULL_DECK_POINTS + C;
  return made
    ? { att: base * mult + beloteAtt, def: beloteDef }
    : { att: beloteAtt, def: base * mult + beloteDef };
}

/** Compute the result of a finished deal (8 tricks played). */
export function computeDealResult(state: GameState): DealResult {
  const contract = state.contract!;
  const att = contract.team;
  const def = otherTeam(att);
  const cp = cardPointsByTeam(state);
  const capot = tricksWonBy(state, att) === 8;
  const beloteAtt = state.belote.team === att ? 20 : 0;
  const beloteDef = state.belote.team === def ? 20 : 0;
  const realizedAtt = capot ? CAPOT_VALUE : cp[att];

  let made: boolean;
  let scored: { att: number; def: number };
  if (contract.value === CAPOT_VALUE) {
    made = capot;
    scored = scoreAnnouncedCapot(made, contract.coinche, beloteAtt, beloteDef);
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
