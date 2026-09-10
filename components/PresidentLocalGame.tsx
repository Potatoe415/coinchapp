"use client";

import { useState } from "react";
import { useLocalPresidentGame } from "@/lib/client/useLocalPresidentGame";
import { LOCAL_PRESIDENT_STORAGE_KEY, clearPersistedGame } from "@/lib/client/localGamePersistence";
import type { ReactionPick } from "@/lib/client/reactions";
import { useReactions } from "@/lib/client/useReactions";
import { PresidentTable, type PresidentGameView } from "./PresidentTable";

export function PresidentLocalGame({ seed, botThinkMs, roundsToPlay }: { seed: number; botThinkMs: number; roundsToPlay: number }) {
  const [gameKey, setGameKey] = useState(0);
  return (
    <PresidentLocalGameInner
      key={gameKey}
      seed={seed + gameKey * 131071}
      botThinkMs={botThinkMs}
      roundsToPlay={roundsToPlay}
      onReset={() => {
        clearPersistedGame(LOCAL_PRESIDENT_STORAGE_KEY);
        setGameKey((k) => k + 1);
      }}
    />
  );
}

function PresidentLocalGameInner({
  seed,
  botThinkMs,
  roundsToPlay,
  onReset,
}: {
  seed: number;
  botThinkMs: number;
  roundsToPlay: number;
  onReset: () => void;
}) {
  const { gv, actions } = useLocalPresidentGame(seed, botThinkMs, roundsToPlay);
  const { reactions, addReaction } = useReactions();

  function onSendReaction(pick: ReactionPick) {
    addReaction(gv.mySeat ?? 0, pick);
  }

  return (
    <PresidentTable
      gv={gv as PresidentGameView}
      reactions={reactions}
      actions={{ ...actions, onReset, onSendReaction }}
    />
  );
}
