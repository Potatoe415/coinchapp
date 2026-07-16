"use client";

import type { CardOf } from "@/lib/cards";
import { CardBack, PlayingCard } from "./PlayingCard";

/** Shared trick-stage visuals (played-card entrance, completed-trick collect/fly-off,
 *  opponent card-back fans) used by every game's table (`GameTableScene.tsx` for
 *  Coinche, `BouillaTable.tsx` for la Bouilla). Only positions/animations live here;
 *  each game keeps its own rules for what a "trick"/"winner" means. */

export type TableSeats = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

function cardKey(card: CardOf<string>): string {
  return `${card.rank}${card.suit}`;
}

export function PlayedCardStage({
  seats,
  trickBySeat,
}: {
  seats: TableSeats;
  trickBySeat: Map<number, CardOf<string>>;
}) {
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

/** Holds the just-finished trick on the felt, then animates its 4 cards gathering
 *  toward the winner's seat and flying off - the visual for the collect-delay pause
 *  every driver already waits out (`COLLECT_DELAY_MS` in `cardGameDriver.ts`). Mount
 *  with a `key` that changes per trick so the animation restarts each time. */
export function CompletedTrickHold({
  seats,
  trickBySeat,
  winner,
}: {
  seats: TableSeats;
  trickBySeat: Map<number, CardOf<string>>;
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
  card?: CardOf<string>;
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
  card?: CardOf<string>;
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
  card?: CardOf<string>;
  dataId?: string;
  enterFrom: "top" | "left" | "right" | "bottom";
  delay: number;
}) {
  if (!card) {
    return <div className="h-24 w-16 rounded-xl bg-[rgba(32,40,58,0.12)]" data-id={dataId} />;
  }
  return <AnimatedPlayedCard key={cardKey(card)} card={card} dataId={dataId} enterFrom={enterFrom} delay={delay} />;
}

function AnimatedPlayedCard({
  card,
  dataId,
  enterFrom,
  delay,
}: {
  card: CardOf<string>;
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

/** Fan of face-down cards for the top opponent's hand, capped at `maxCount` cards
 *  wide (Coinche never holds more than 8; Bouilla starts at 13). */
export function CardBackFanH({ count, maxCount = 8 }: { count: number; maxCount?: number }) {
  const n = Math.min(count, maxCount);
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

export function CardBackStackV({ count, maxCount = 8 }: { count: number; maxCount?: number }) {
  const n = Math.min(count, maxCount);
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
