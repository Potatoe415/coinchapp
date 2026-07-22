import { LocalGame } from "@/components/LocalGame";
import { BouillaLocalGame } from "@/components/BouillaLocalGame";
import { BOT_PUNCH_LEVELS, type BotPunch, type ScoringRules } from "@/lib/coinche";
import { DEFAULT_BOT_THINK_MS, MAX_BOT_THINK_MS, MIN_BOT_THINK_MS } from "@/lib/supabase/types";

const TARGETS = [500, 1000, 1500, 2000];

function parsePunch(raw: string | undefined): BotPunch {
  return BOT_PUNCH_LEVELS.includes(raw as BotPunch) ? (raw as BotPunch) : "med";
}

function parseBotThinkMs(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_BOT_THINK_MS;
  return Math.min(MAX_BOT_THINK_MS, Math.max(MIN_BOT_THINK_MS, n));
}

function seedFromParams(seedParam?: string): number {
  const explicit = Number(seedParam);
  if (Number.isInteger(explicit) && explicit > 0) return explicit >>> 0;
  return (Math.random() * 0x100000000) >>> 0;
}

function parsePoints(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export default async function LocalPlayPage({
  searchParams,
}: {
  searchParams: Promise<{
    game?: string;
    target?: string;
    seed?: string;
    countContractOnlyIfMade?: string;
    failedContractDefensePoints?: string;
    zeroPointsForNonContractingTeamWhenContractMade?: string;
    capotMadePoints?: string;
    capotFailedDefensePoints?: string;
    allowSpecialBids?: string;
    requireMorePointsToWin?: string;
    botPunch?: string;
    botThinkMs?: string;
  }>;
}) {
  const sp = await searchParams;
  const seed = seedFromParams(sp.seed);
  const botThinkMs = parseBotThinkMs(sp.botThinkMs);
  if (sp.game === "bouilla") {
    return <BouillaLocalGame seed={seed} botThinkMs={botThinkMs} />;
  }
  const target = Number(sp.target);
  const targetPoints = TARGETS.includes(target) ? target : 1000;
  const scoringRules: ScoringRules = {
    countContractOnlyIfMade: sp.countContractOnlyIfMade === "true",
    failedContractDefensePoints: parsePoints(sp.failedContractDefensePoints, 160),
    zeroPointsForNonContractingTeamWhenContractMade: sp.zeroPointsForNonContractingTeamWhenContractMade === "true",
    capotMadePoints: parsePoints(sp.capotMadePoints, 250),
    capotFailedDefensePoints: parsePoints(sp.capotFailedDefensePoints, 250),
    allowToutAtoutSansAtout: sp.allowSpecialBids === "true",
    requireMorePointsToWin: sp.requireMorePointsToWin !== "false",
  };
  const botPunch = parsePunch(sp.botPunch);
  return (
    <LocalGame
      targetPoints={targetPoints}
      seed={seed}
      scoringRules={scoringRules}
      botPunch={botPunch}
      botThinkMs={botThinkMs}
    />
  );
}
