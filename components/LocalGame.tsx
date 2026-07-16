"use client";

import { useCallback, useRef, useState } from "react";
import { useLocalGame } from "@/lib/client/useLocalGame";
import type { BotPunch, ScoringRules } from "@/lib/coinche";
import type { EmojiReaction } from "./EmojiButton";
import { GameTable, type CoincheGameView } from "./GameTable";

const REACTION_TTL = 3000;

export function LocalGame({
  targetPoints,
  seed,
  scoringRules,
  botPunch,
}: {
  targetPoints: number;
  seed: number;
  scoringRules: ScoringRules;
  botPunch: BotPunch;
}) {
  const [gameKey, setGameKey] = useState(0);
  return (
    <LocalGameInner
      key={gameKey}
      targetPoints={targetPoints}
      seed={seed + gameKey * 131071}
      scoringRules={scoringRules}
      botPunch={botPunch}
      onReset={() => setGameKey((k) => k + 1)}
    />
  );
}

function LocalGameInner({
  targetPoints,
  seed,
  scoringRules,
  botPunch,
  onReset,
}: {
  targetPoints: number;
  seed: number;
  scoringRules: ScoringRules;
  botPunch: BotPunch;
  onReset: () => void;
}) {
  const { gv, actions } = useLocalGame(targetPoints, seed, scoringRules, botPunch);
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
    <GameTable
      gv={gv as CoincheGameView}
      reactions={reactions}
      actions={{ ...actions, onReset, onSendEmoji: (emoji) => sendReaction(gv.mySeat ?? 0, emoji) }}
    />
  );
}
