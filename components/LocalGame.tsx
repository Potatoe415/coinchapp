"use client";

import { useState } from "react";
import { useLocalGame } from "@/lib/client/useLocalGame";
import { LOCAL_COINCHE_STORAGE_KEY, clearPersistedGame } from "@/lib/client/localGamePersistence";
import type { ReactionPick } from "@/lib/client/reactions";
import { useReactions } from "@/lib/client/useReactions";
import type { BotPunch, ScoringRules } from "@/lib/coinche";
import { GameTable, type CoincheGameView } from "./GameTable";

export function LocalGame({
  targetPoints,
  seed,
  scoringRules,
  botPunch,
  botThinkMs,
}: {
  targetPoints: number;
  seed: number;
  scoringRules: ScoringRules;
  botPunch: BotPunch;
  botThinkMs: number;
}) {
  const [gameKey, setGameKey] = useState(0);
  return (
    <LocalGameInner
      key={gameKey}
      targetPoints={targetPoints}
      seed={seed + gameKey * 131071}
      scoringRules={scoringRules}
      botPunch={botPunch}
      botThinkMs={botThinkMs}
      onReset={() => {
        clearPersistedGame(LOCAL_COINCHE_STORAGE_KEY);
        setGameKey((k) => k + 1);
      }}
    />
  );
}

function LocalGameInner({
  targetPoints,
  seed,
  scoringRules,
  botPunch,
  botThinkMs,
  onReset,
}: {
  targetPoints: number;
  seed: number;
  scoringRules: ScoringRules;
  botPunch: BotPunch;
  botThinkMs: number;
  onReset: () => void;
}) {
  const { gv, actions } = useLocalGame(targetPoints, seed, scoringRules, botPunch, botThinkMs);
  const { reactions, addReaction } = useReactions();

  function onSendReaction(pick: ReactionPick) {
    addReaction(gv.mySeat ?? 0, pick);
  }

  return (
    <GameTable
      gv={gv as CoincheGameView}
      reactions={reactions}
      actions={{ ...actions, onReset, onSendReaction }}
    />
  );
}
