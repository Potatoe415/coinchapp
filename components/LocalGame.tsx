"use client";

import { useState } from "react";
import { useLocalGame } from "@/lib/client/useLocalGame";
import type { Difficulty, ScoringRules } from "@/lib/coinche";
import { GameTable } from "./GameTable";

export function LocalGame({
  targetPoints,
  difficulty,
  seed,
  scoringRules,
}: {
  targetPoints: number;
  difficulty: Difficulty;
  seed: number;
  scoringRules: ScoringRules;
}) {
  const [gameKey, setGameKey] = useState(0);
  return (
    <LocalGameInner
      key={gameKey}
      targetPoints={targetPoints}
      difficulty={difficulty}
      seed={seed + gameKey * 131071}
      scoringRules={scoringRules}
      onReset={() => setGameKey((k) => k + 1)}
    />
  );
}

function LocalGameInner({
  targetPoints,
  difficulty,
  seed,
  scoringRules,
  onReset,
}: {
  targetPoints: number;
  difficulty: Difficulty;
  seed: number;
  scoringRules: ScoringRules;
  onReset: () => void;
}) {
  const { gv, actions } = useLocalGame(targetPoints, difficulty, seed, scoringRules);
  return <GameTable gv={gv} actions={{ ...actions, onReset }} />;
}
