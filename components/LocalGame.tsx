"use client";

import { useLocalGame } from "@/lib/client/useLocalGame";
import type { Difficulty } from "@/lib/coinche";
import { GameTable } from "./GameTable";

export function LocalGame({
  targetPoints,
  difficulty,
  seed,
}: {
  targetPoints: number;
  difficulty: Difficulty;
  seed: number;
}) {
  const { gv, actions } = useLocalGame(targetPoints, difficulty, seed);
  return <GameTable gv={gv} actions={actions} />;
}
