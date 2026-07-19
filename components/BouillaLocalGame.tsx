"use client";

import { useCallback, useRef, useState } from "react";
import { useLocalBouillaGame } from "@/lib/client/useLocalBouillaGame";
import { LOCAL_BOUILLA_STORAGE_KEY, clearPersistedGame } from "@/lib/client/localGamePersistence";
import type { EmojiReaction } from "./EmojiButton";
import { BouillaTable, type BouillaGameView } from "./BouillaTable";

const REACTION_TTL = 3000;

export function BouillaLocalGame({ seed }: { seed: number }) {
  const [gameKey, setGameKey] = useState(0);
  return (
    <BouillaLocalGameInner
      key={gameKey}
      seed={seed + gameKey * 131071}
      onReset={() => {
        clearPersistedGame(LOCAL_BOUILLA_STORAGE_KEY);
        setGameKey((k) => k + 1);
      }}
    />
  );
}

function BouillaLocalGameInner({ seed, onReset }: { seed: number; onReset: () => void }) {
  const { gv, actions } = useLocalBouillaGame(seed);
  const [reactions, setReactions] = useState<Map<number, EmojiReaction>>(new Map());
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const sendReaction = useCallback((seat: number, emoji: string) => {
    const prev = timers.current.get(seat);
    if (prev) clearTimeout(prev);
    setReactions((m) => new Map(m).set(seat, { emoji, id: Date.now() }));
    timers.current.set(
      seat,
      setTimeout(() => {
        setReactions((m) => { const n = new Map(m); n.delete(seat); return n; });
        timers.current.delete(seat);
      }, REACTION_TTL),
    );
  }, []);

  return (
    <BouillaTable
      gv={gv as BouillaGameView}
      reactions={reactions}
      actions={{ ...actions, onReset, onSendEmoji: (emoji) => sendReaction(gv.mySeat ?? 0, emoji) }}
    />
  );
}
