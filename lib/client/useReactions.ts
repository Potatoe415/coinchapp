"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { isGiphyMediaUrl } from "@/lib/giphy/gifs";
import {
  EMOJI_REACTION_TTL_MS,
  GIF_REACTION_TTL_MS,
  type ReactionPick,
  type TableReaction,
} from "./reactions";

type TimerMap = Map<number, ReturnType<typeof setTimeout>>;

export function useReactions() {
  const [reactions, setReactions] = useState<Map<number, TableReaction>>(new Map());
  const timers = useRef<TimerMap>(new Map());

  const addReaction = useCallback((seat: number, pick: ReactionPick) => {
    const next = toTableReaction(pick);
    if (!next) return;
    clearSeatTimer(timers.current, seat);
    setReactions((m) => new Map(m).set(seat, next));
    const ttl = pick.kind === "gif" ? GIF_REACTION_TTL_MS : EMOJI_REACTION_TTL_MS;
    timers.current.set(seat, scheduleClear(setReactions, timers.current, seat, ttl));
  }, []);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
  }, []);

  return { reactions, addReaction };
}

function toTableReaction(pick: ReactionPick): TableReaction | null {
  if (pick.kind === "gif") {
    if (!isGiphyMediaUrl(pick.gifUrl)) return null;
    return { id: Date.now(), kind: "gif", gifUrl: pick.gifUrl };
  }
  return { id: Date.now(), kind: "emoji", emoji: pick.emoji };
}

function clearSeatTimer(timers: TimerMap, seat: number) {
  const prev = timers.get(seat);
  if (prev) clearTimeout(prev);
}

function scheduleClear(
  setReactions: Dispatch<SetStateAction<Map<number, TableReaction>>>,
  timers: TimerMap,
  seat: number,
  ttl: number,
) {
  return setTimeout(() => {
    setReactions((m) => {
      const next = new Map(m);
      next.delete(seat);
      return next;
    });
    timers.delete(seat);
  }, ttl);
}
