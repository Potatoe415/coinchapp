"use client";

import { useEffect, useState } from "react";

/**
 * Delays flipping to `true` until `delayMs` after `shouldShow` first becomes true - long enough
 * for the trick-collect animation to finish before an overlay covers it (see `TrickStage.tsx`).
 * Flips back to `false` immediately once `shouldShow` goes false (e.g. the next deal/round has
 * already started). Shared by the deal/round-end overlays and the seats that need to know when
 * those overlays are covering the table (`GameTableScene.tsx`, `BouillaTable.tsx`).
 */
export function useDelayedVisible(shouldShow: boolean, delayMs: number): boolean {
  const [visible, setVisible] = useState(false);
  const [prevShouldShow, setPrevShouldShow] = useState(shouldShow);
  if (shouldShow !== prevShouldShow) {
    setPrevShouldShow(shouldShow);
    if (!shouldShow) setVisible(false);
  }

  useEffect(() => {
    if (!shouldShow) return;
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [shouldShow, delayMs]);

  return visible;
}
