"use client";

import { formatText, useI18n } from "@/lib/client/i18n";

interface Props {
  secondsLeft: number;
}

/**
 * "Are you still there?" idle-turn nudge (see lib/client/useStillThereTimer.ts).
 * Deliberately a small floating, non-blocking banner rather than a full modal
 * overlay: the player must still be able to tap and play a card underneath it
 * to cancel the countdown, which a backdrop-blocking dialog (see RulesModal)
 * would prevent.
 */
export function StillThereModal({ secondsLeft }: Props) {
  const { t } = useI18n();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4"
      data-id="still-there-banner"
    >
      <div className="flex items-center gap-3 rounded-full bg-[var(--surface)] px-4 py-2.5 shadow-xl ring-2 ring-[var(--accent-yellow)]">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-yellow)] text-sm font-black text-[var(--surface)]"
          data-id="still-there-countdown"
        >
          {secondsLeft}
        </span>
        <div className="text-left">
          <p className="text-sm font-bold text-[var(--card-face)]" data-id="still-there-question">
            {t("stillThereQuestion")}
          </p>
          <p className="text-xs text-[var(--card-face)]/70">
            {formatText(t("stillThereCountdown"), { seconds: secondsLeft })}
          </p>
        </div>
      </div>
    </div>
  );
}
