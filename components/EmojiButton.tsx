"use client";

import { useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import type { ReactionPick, TableReaction } from "@/lib/client/reactions";
import { GifPicker } from "./GifPicker";
import { ReactionBubble } from "./ReactionBubble";

export type { TableReaction as EmojiReaction };

const EMOJIS = ["👍", "😂", "😮", "😢", "🔥", "👏", "🖕", "🍑", "💩", "🐦", "🪦", "🤡"];

export function EmojiButton({
  myReaction,
  onSelect,
}: {
  myReaction?: TableReaction;
  onSelect: (pick: ReactionPick) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "gif">("emoji");

  function pick(next: ReactionPick) {
    onSelect(next);
    setOpen(false);
  }

  return (
    <div
      className="absolute bottom-0 right-0 z-30 flex flex-col items-end gap-1.5"
      data-id="emoji-button-container"
    >
      {myReaction && (
        <ReactionBubble
          reaction={myReaction}
          size="xl"
          dataId={myReaction.kind === "gif" ? "my-gif-reaction" : "my-emoji-reaction"}
        />
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
          <ReactionPicker tab={tab} onTab={setTab} onPick={pick} />
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

function ReactionPicker({
  tab,
  onTab,
  onPick,
}: {
  tab: "emoji" | "gif";
  onTab: (tab: "emoji" | "gif") => void;
  onPick: (pick: ReactionPick) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="relative z-30 w-[min(18rem,calc(100vw-2rem))] rounded-2xl bg-black/80 p-2 shadow-xl backdrop-blur-sm"
      data-id="emoji-picker"
    >
      <div className="mb-2 flex gap-1" data-id="reaction-tabs">
        <TabButton active={tab === "emoji"} onClick={() => onTab("emoji")} dataId="reaction-tab-emoji">
          {t("emojiTab")}
        </TabButton>
        <TabButton active={tab === "gif"} onClick={() => onTab("gif")} dataId="reaction-tab-gif">
          {t("gifTab")}
        </TabButton>
      </div>
      {tab === "gif" ? (
        <GifPicker onSelect={(gifUrl) => onPick({ kind: "gif", gifUrl })} />
      ) : (
        <EmojiGrid onPick={onPick} />
      )}
    </div>
  );
}

function EmojiGrid({ onPick }: { onPick: (pick: ReactionPick) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-1 py-1">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="text-2xl leading-none transition-transform hover:scale-125 active:scale-110"
          onClick={() => onPick({ kind: "emoji", emoji })}
          data-id={`emoji-pick-${emoji}`}
          aria-label={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  dataId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dataId: string;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-id={dataId}
      className={`flex-1 rounded-lg py-1 text-xs font-bold uppercase tracking-wide ${
        active ? "bg-white/20 text-white" : "text-white/50"
      }`}
    >
      {children}
    </button>
  );
}
