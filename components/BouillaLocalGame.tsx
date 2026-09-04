"use client";

import { useState } from "react";
import { useLocalBouillaGame } from "@/lib/client/useLocalBouillaGame";
import { LOCAL_BOUILLA_STORAGE_KEY, clearPersistedGame } from "@/lib/client/localGamePersistence";
import type { ReactionPick } from "@/lib/client/reactions";
import { useReactions } from "@/lib/client/useReactions";
import { BouillaTable, type BouillaGameView } from "./BouillaTable";

export function BouillaLocalGame({ seed, botThinkMs }: { seed: number; botThinkMs: number }) {
  const [gameKey, setGameKey] = useState(0);
  return (
    <BouillaLocalGameInner
      key={gameKey}
      seed={seed + gameKey * 131071}
      botThinkMs={botThinkMs}
      onReset={() => {
        clearPersistedGame(LOCAL_BOUILLA_STORAGE_KEY);
        setGameKey((k) => k + 1);
      }}
    />
  );
}

function BouillaLocalGameInner({
  seed,
  botThinkMs,
  onReset,
}: {
  seed: number;
  botThinkMs: number;
  onReset: () => void;
}) {
  const { gv, actions } = useLocalBouillaGame(seed, botThinkMs);
  const { reactions, addReaction } = useReactions();

  function onSendReaction(pick: ReactionPick) {
    addReaction(gv.mySeat ?? 0, pick);
  }

  return (
    <BouillaTable
      gv={gv as BouillaGameView}
      reactions={reactions}
      actions={{ ...actions, onReset, onSendReaction }}
    />
  );
}
