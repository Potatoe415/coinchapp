"use client";

import React, { useEffect, useRef, useState } from "react";
import { cardId, type Card, type PlayerView } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import { DealOverlay } from "./DealOverlay";
import type { EmojiReaction } from "./EmojiButton";
import { playerName, seatTeam } from "./gameTableHelpers";
import { PlayerBadge } from "./PlayerBadge";
import { CardBack, PlayingCard } from "./PlayingCard";

function isSeatThinking(view: PlayerView, seat: number): boolean {
  if (view.phase !== "bidding" && view.phase !== "playing") return false;
  if (view.turn !== seat) return false;
  return true;
}

export type TableSeats = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export function GameTableScene({
  gv,
  view,
  seats,
  trickBySeat,
  lastTrickBySeat,
  lastTrickKey,
  lastTrickWinner,
  bimTrickKey,
  reactions,
  onNextDeal,
}: {
  gv: GameView;
  view: PlayerView;
  seats: TableSeats;
  trickBySeat: Map<number, Card>;
  lastTrickBySeat: Map<number, Card> | null;
  lastTrickKey: string | null;
  lastTrickWinner: number | null;
  bimTrickKey: string | null;
  reactions?: Map<number, EmojiReaction>;
  onNextDeal: () => Promise<void> | void;
}) {
  return (
    <section className="relative z-10 h-[720px] w-full shrink-0" data-id="table-scene">
      <div
        className="absolute inset-x-[11%] bottom-[19%] top-[29%] rounded-[3rem] bg-[rgba(255,250,242,0.08)] shadow-[inset_0_0_55px_rgba(22,200,240,0.22)] ring-[10px] ring-[rgba(242,196,79,0.18)]"
        data-id="central-felt"
      />
      <TopOpponent gv={gv} view={view} seat={seats.top} reaction={reactions?.get(seats.top)} />
      <SideOpponent gv={gv} view={view} seat={seats.left} side="left" reaction={reactions?.get(seats.left)} />
      <SideOpponent gv={gv} view={view} seat={seats.right} side="right" reaction={reactions?.get(seats.right)} />
      <PlayedCardStage seats={seats} trickBySeat={trickBySeat} />
      {lastTrickBySeat && lastTrickKey && (
        <CompletedTrickHold key={lastTrickKey} seats={seats} trickBySeat={lastTrickBySeat} winner={lastTrickWinner} />
      )}
      <BeloteFlash announced={view.beloteAnnounced} />
      <BimFlash bimTrickKey={bimTrickKey} />
      <DealOverlay view={view} onNextDeal={onNextDeal} />
    </section>
  );
}

function TopOpponent({ gv, view, seat, reaction }: { gv: GameView; view: PlayerView; seat: number; reaction?: EmojiReaction }) {
  return (
    <div className="absolute left-1/2 top-[13%] flex -translate-x-1/2 flex-col items-center" data-id="table-top">
      <CardBackFanH count={view.handCounts[seat]} />
      <div className="mt-2" data-id="table-top-badge-wrap">
        <PlayerBadge
          name={playerName(gv, seat)}
          team={seatTeam(seat)}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
          isThinking={isSeatThinking(view, seat)}
          reaction={reaction}
          dataId={`player-seat-${seat}`}
        />
      </div>
    </div>
  );
}

function SideOpponent({
  gv,
  view,
  seat,
  side,
  reaction,
}: {
  gv: GameView;
  view: PlayerView;
  seat: number;
  side: "left" | "right";
  reaction?: EmojiReaction;
}) {
  const sideClass = side === "left" ? "left-0 flex-row" : "right-0 flex-row-reverse";
  const handShiftClass = side === "left" ? "-translate-x-3/4" : "translate-x-3/4";
  const badgeNudgeClass = side === "left" ? "-ml-[50px]" : "-mr-[50px]";
  const badgeRotateClass = side === "right" ? "rotate-180" : "";
  return (
    <div className={`absolute top-[41%] flex items-center gap-0 ${sideClass}`} data-id={`table-${side}`}>
      <div className={handShiftClass} data-id={`table-${side}-hand`}>
        <CardBackStackV count={view.handCounts[seat]} />
      </div>
      <div className={`${badgeNudgeClass} ${badgeRotateClass}`} data-id={`table-${side}-badge-wrap`}>
        <PlayerBadge
          name={playerName(gv, seat)}
          team={seatTeam(seat)}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
          isThinking={isSeatThinking(view, seat)}
          reaction={reaction}
          orientation="vertical"
          dataId={`player-seat-${seat}`}
        />
      </div>
    </div>
  );
}

function PlayedCardStage({ seats, trickBySeat }: { seats: TableSeats; trickBySeat: Map<number, Card> }) {
  return (
    <>
      <SlotBox
        className="top-[36%] left-1/2 -translate-x-1/2"
        card={trickBySeat.get(seats.top)}
        dataId="played-top"
        enterFrom="top"
        delay={0}
      />
      <SlotBox
        className="top-[45%] left-[27%]"
        card={trickBySeat.get(seats.left)}
        dataId="played-left"
        enterFrom="left"
        delay={90}
      />
      <SlotBox
        className="top-[45%] right-[27%]"
        card={trickBySeat.get(seats.right)}
        dataId="played-right"
        enterFrom="right"
        delay={180}
      />
      <SlotBox
        className="bottom-[25%] left-1/2 -translate-x-1/2"
        card={trickBySeat.get(seats.bottom)}
        dataId="table-my-played"
        enterFrom="bottom"
        delay={0}
      />
    </>
  );
}

function CompletedTrickHold({
  seats,
  trickBySeat,
  winner,
}: {
  seats: TableSeats;
  trickBySeat: Map<number, Card>;
  winner: number | null;
}) {
  const dir =
    winner === null
      ? "bottom"
      : winner === seats.top
        ? "top"
        : winner === seats.left
          ? "left"
          : winner === seats.right
            ? "right"
            : "bottom";
  const flyX = dir === "left" ? "-300px" : dir === "right" ? "300px" : "0px";
  const flyY = dir === "top" ? "-320px" : dir === "bottom" ? "280px" : "0px";

  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-id="completed-trick-hold">
      <CollectSlot
        className="left-1/2 top-[36%] -translate-x-1/2"
        card={trickBySeat.get(seats.top)}
        dataId="held-top"
        gatherX="0px"
        gatherY="55px"
        gatherRot="4deg"
        flyX={flyX}
        flyY={flyY}
      />
      <CollectSlot
        className="left-[27%] top-[45%]"
        card={trickBySeat.get(seats.left)}
        dataId="held-left"
        gatherX="100px"
        gatherY="0px"
        gatherRot="-5deg"
        flyX={flyX}
        flyY={flyY}
      />
      <CollectSlot
        className="right-[27%] top-[45%]"
        card={trickBySeat.get(seats.right)}
        dataId="held-right"
        gatherX="-100px"
        gatherY="0px"
        gatherRot="5deg"
        flyX={flyX}
        flyY={flyY}
      />
      <CollectSlot
        className="bottom-[25%] left-1/2 -translate-x-1/2"
        card={trickBySeat.get(seats.bottom)}
        dataId="held-bottom"
        gatherX="0px"
        gatherY="-160px"
        gatherRot="-4deg"
        flyX={flyX}
        flyY={flyY}
      />
    </div>
  );
}

function BimFlash({ bimTrickKey }: { bimTrickKey: string | null }) {
  const [visible, setVisible] = useState(false);
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    if (!bimTrickKey) { prevKey.current = null; return; }
    if (bimTrickKey === prevKey.current) return;
    prevKey.current = bimTrickKey;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1900);
    return () => clearTimeout(t);
  }, [bimTrickKey]);

  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center pt-6"
      data-id="bim-flash"
    >
      <span
        className="bim-flash select-none text-[7rem] font-black leading-none tracking-tight"
        style={{
          color: "#fff",
          textShadow:
            "0 0 40px #ff3b30, 0 0 80px #ff6b00, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
        }}
      >
        BIM&nbsp;!
      </span>
    </div>
  );
}

function BeloteFlash({ announced }: { announced: ("belote" | "rebelote")[] }) {
  const [flash, setFlash] = useState<"belote" | "rebelote" | null>(null);
  const prevLen = useRef(0);
  const len = announced.length;

  useEffect(() => {
    if (len === 0) { prevLen.current = 0; return; }
    if (len > prevLen.current) {
      const label = announced[len - 1];
      prevLen.current = len;
      setFlash(label);
      const t = window.setTimeout(() => setFlash(null), 2200);
      return () => clearTimeout(t);
    }
  }, [len, announced]);

  if (!flash) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[44%] z-30 flex justify-center" data-id="belote-flash">
      <span className="belote-flash rounded-full bg-black/50 px-6 py-2 text-3xl font-extrabold tracking-widest text-[var(--accent-yellow)] shadow-xl">
        {flash === "belote" ? "Belote !" : "Rebelote !"}
      </span>
    </div>
  );
}

function CollectSlot({
  className,
  card,
  dataId,
  gatherX,
  gatherY,
  gatherRot,
  flyX,
  flyY,
}: {
  className: string;
  card?: Card;
  dataId: string;
  gatherX: string;
  gatherY: string;
  gatherRot: string;
  flyX: string;
  flyY: string;
}) {
  if (!card) return null;
  return (
    <div className={`absolute ${className}`} data-id={`${dataId}-slot`}>
      <div
        className="trick-collect-card"
        style={
          {
            "--gather-x": gatherX,
            "--gather-y": gatherY,
            "--gather-rot": gatherRot,
            "--fly-x": flyX,
            "--fly-y": flyY,
          } as React.CSSProperties
        }
      >
        <PlayingCard card={card} size="lg" dataId={dataId} />
      </div>
    </div>
  );
}

function SlotBox({
  className,
  card,
  dataId,
  enterFrom,
  delay,
}: {
  className: string;
  card?: Card;
  dataId: string;
  enterFrom: "top" | "left" | "right" | "bottom";
  delay: number;
}) {
  return (
    <div className={`absolute ${className}`} data-id={`${dataId}-slot`}>
      <PlayedSlot card={card} dataId={dataId} enterFrom={enterFrom} delay={delay} />
    </div>
  );
}

function PlayedSlot({
  card,
  dataId,
  enterFrom,
  delay,
}: {
  card?: Card;
  dataId?: string;
  enterFrom: "top" | "left" | "right" | "bottom";
  delay: number;
}) {
  if (!card) {
    return <div className="h-24 w-16 rounded-xl bg-[rgba(32,40,58,0.12)]" data-id={dataId} />;
  }
  return <AnimatedPlayedCard key={cardId(card)} card={card} dataId={dataId} enterFrom={enterFrom} delay={delay} />;
}

function AnimatedPlayedCard({
  card,
  dataId,
  enterFrom,
  delay,
}: {
  card: Card;
  dataId?: string;
  enterFrom: "top" | "left" | "right" | "bottom";
  delay: number;
}) {
  return (
    <div
      className="played-card-enter will-change-transform"
      style={{ ...animationStart(enterFrom), animationDelay: `${delay}ms` }}
      data-id={dataId ? `${dataId}-anim` : undefined}
    >
      <PlayingCard card={card} size="lg" dataId={dataId} />
    </div>
  );
}

function animationStart(enterFrom: "top" | "left" | "right" | "bottom") {
  if (enterFrom === "top") return { "--played-card-from": "translate3d(0,-210px,0) scale(0.7) rotate(-10deg)" };
  if (enterFrom === "left") return { "--played-card-from": "translate3d(-210px,0,0) scale(0.7) rotate(-14deg)" };
  if (enterFrom === "right") return { "--played-card-from": "translate3d(210px,0,0) scale(0.7) rotate(14deg)" };
  return { "--played-card-from": "translate3d(0,210px,0) scale(0.7) rotate(10deg)" };
}

const FAN_STEP_H = 22;
const CARD_W_MD = 56;

function CardBackFanH({ count }: { count: number }) {
  const n = Math.min(count, 8);
  if (n === 0) return <div className="h-24 w-14" />;
  const totalW = CARD_W_MD + (n - 1) * FAN_STEP_H;
  return (
    <div className="relative h-24" style={{ width: totalW }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="absolute bottom-0" style={{ left: i * FAN_STEP_H, zIndex: i }}>
          <CardBack size="md" />
        </div>
      ))}
    </div>
  );
}

function CardBackStackV({ count }: { count: number }) {
  const n = Math.min(count, 8);
  if (n === 0) return <div className="h-14 w-20" />;
  return (
    <div className="relative w-20" style={{ height: 56 + (n - 1) * 7 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="absolute" style={{ top: i * 7, zIndex: i }}>
          <LandscapeCardBack />
        </div>
      ))}
    </div>
  );
}

function LandscapeCardBack() {
  return (
    <div className="relative h-14 w-20">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90">
        <CardBack size="md" />
      </div>
    </div>
  );
}
