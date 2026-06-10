"use client";

import { useState } from "react";
import { useLocalGame } from "@/lib/client/useLocalGame";
import type { ScoringRules } from "@/lib/coinche";
import { GameTable } from "./GameTable";

export function LocalGame({
  targetPoints,
  seed,
  scoringRules,
}: {
  targetPoints: number;
  seed: number;
  scoringRules: ScoringRules;
}) {
  const [gameKey, setGameKey] = useState(0);
  return (
    <LocalGameInner
      key={gameKey}
      targetPoints={targetPoints}
      seed={seed + gameKey * 131071}
      scoringRules={scoringRules}
      onReset={() => setGameKey((k) => k + 1)}
    />
  );
}

function LocalGameInner({
  targetPoints,
  seed,
  scoringRules,
  onReset,
}: {
  targetPoints: number;
  seed: number;
  scoringRules: ScoringRules;
  onReset: () => void;
}) {
  const { gv, actions } = useLocalGame(targetPoints, seed, scoringRules);
  return <GameTable gv={gv} actions={{ ...actions, onReset }} />;
}
