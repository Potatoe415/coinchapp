import { LocalGame } from "@/components/LocalGame";
import type { Difficulty, ScoringRules } from "@/lib/coinche";

const TARGETS = [500, 1000, 1500, 2000];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function seedFromParams(targetPoints: number, difficulty: Difficulty, seedParam?: string): number {
  const explicit = Number(seedParam);
  if (Number.isInteger(explicit) && explicit > 0) return explicit >>> 0;

  return Array.from(`${targetPoints}:${difficulty}`).reduce(
    (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
}

function parsePoints(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export default async function LocalPlayPage({
  searchParams,
}: {
  searchParams: Promise<{
    target?: string;
    difficulty?: string;
    seed?: string;
    countContractOnlyIfMade?: string;
    failedContractDefensePoints?: string;
    zeroPointsForNonContractingTeamWhenContractMade?: string;
    capotMadePoints?: string;
    capotFailedDefensePoints?: string;
  }>;
}) {
  const sp = await searchParams;
  const target = Number(sp.target);
  const targetPoints = TARGETS.includes(target) ? target : 1000;
  const difficulty = DIFFICULTIES.includes(sp.difficulty as Difficulty)
    ? (sp.difficulty as Difficulty)
    : "medium";
  const seed = seedFromParams(targetPoints, difficulty, sp.seed);
  const scoringRules: ScoringRules = {
    countContractOnlyIfMade: sp.countContractOnlyIfMade === "true",
    failedContractDefensePoints: parsePoints(sp.failedContractDefensePoints, 160),
    zeroPointsForNonContractingTeamWhenContractMade: sp.zeroPointsForNonContractingTeamWhenContractMade === "true",
    capotMadePoints: parsePoints(sp.capotMadePoints, 250),
    capotFailedDefensePoints: parsePoints(sp.capotFailedDefensePoints, 250),
  };
  return <LocalGame targetPoints={targetPoints} difficulty={difficulty} seed={seed} scoringRules={scoringRules} />;
}
