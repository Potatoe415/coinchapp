"use client";

import { useState } from "react";
import { useI18n } from "@/lib/client/i18n";

export type EmojiReaction = { emoji: string; id: number };

const EMOJIS = ["👍", "😂", "😮", "😢", "🔥", "👏", "🖕"];

export function EmojiButton({
  myReaction,
  onSelect,
}: {
  myReaction?: EmojiReaction;
  onSelect: (emoji: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function pick(emoji: string) {
    onSelect(emoji);
    setOpen(false);
  }

  return (
    <div
      className="absolute bottom-0 right-0 z-30 flex flex-col items-end gap-1.5"
      data-id="emoji-button-container"
    >
      {myReaction && (
        <span
          key={myReaction.id}
          className="emoji-react text-8xl leading-none"
          data-id="my-emoji-reaction"
        >
          {myReaction.emoji}
        </span>
      )}
      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative z-30 flex gap-2 rounded-2xl bg-black/70 px-3 py-2 shadow-xl backdrop-blur-sm"
            data-id="emoji-picker"
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="text-4xl leading-none transition-transform hover:scale-125 active:scale-110"
                onClick={() => pick(emoji)}
                data-id={`emoji-pick-${emoji}`}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-2xl shadow-lg backdrop-blur-sm transition-all hover:bg-black/70 active:scale-95"
        onClick={() => setOpen((v) => !v)}
        data-id="emoji-button"
        aria-label={t("sendEmoji")}
      >
        😊
      </button>
    </div>
  );
}
