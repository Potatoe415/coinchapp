"use client";

import { cardId, type Card, type PlayerView } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import { DealOverlay } from "./DealOverlay";
import { playerName, seatTeam } from "./gameTableHelpers";
import { PlayerBadge } from "./PlayerBadge";
import { CardBack, PlayingCard } from "./PlayingCard";

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
  onNextDeal,
}: {
  gv: GameView;
  view: PlayerView;
  seats: TableSeats;
  trickBySeat: Map<number, Card>;
  lastTrickBySeat: Map<number, Card> | null;
  lastTrickKey: string | null;
  onNextDeal: () => Promise<void> | void;
}) {
  return (
    <section className="relative z-10 h-svh min-h-[720px] w-full" data-id="table-scene">
      <div
        className="absolute inset-x-[11%] bottom-[19%] top-[29%] rounded-[3rem] bg-white/5 shadow-[inset_0_0_55px_rgba(117,255,142,0.12)] ring-[10px] ring-emerald-400/10"
        data-id="central-felt"
      />
      <TopOpponent gv={gv} view={view} seat={seats.top} />
      <SideOpponent gv={gv} view={view} seat={seats.left} side="left" />
      <SideOpponent gv={gv} view={view} seat={seats.right} side="right" />
      <PlayedCardStage seats={seats} trickBySeat={trickBySeat} />
      {lastTrickBySeat && lastTrickKey && (
        <CompletedTrickHold key={lastTrickKey} seats={seats} trickBySeat={lastTrickBySeat} />
      )}
      <DealOverlay view={view} onNextDeal={onNextDeal} />
    </section>
  );
}

function TopOpponent({ gv, view, seat }: { gv: GameView; view: PlayerView; seat: number }) {
  return (
    <div className="absolute left-1/2 top-[13%] flex -translate-x-1/2 flex-col items-center" data-id="table-top">
      <CardBackFanH count={view.handCounts[seat]} />
      <div className="-mt-2" data-id="table-top-badge-wrap">
        <PlayerBadge
          name={playerName(gv, seat)}
          team={seatTeam(seat)}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
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
}: {
  gv: GameView;
  view: PlayerView;
  seat: number;
  side: "left" | "right";
}) {
  const sideClass = side === "left" ? "left-0 flex-row" : "right-0 flex-row-reverse";
  const handShiftClass = side === "left" ? "-translate-x-3/4" : "translate-x-3/4";
  const badgeNudgeClass = side === "left" ? "-ml-3" : "-mr-3";
  return (
    <div className={`absolute top-[41%] flex items-center gap-0 ${sideClass}`} data-id={`table-${side}`}>
      <div className={handShiftClass} data-id={`table-${side}-hand`}>
        <CardBackStackV count={view.handCounts[seat]} />
      </div>
      <div className={badgeNudgeClass} data-id={`table-${side}-badge-wrap`}>
        <PlayerBadge
          name={playerName(gv, seat)}
          team={seatTeam(seat)}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
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

function CompletedTrickHold({ seats, trickBySeat }: { seats: TableSeats; trickBySeat: Map<number, Card> }) {
  return (
    <div className="completed-trick-hold absolute inset-0 z-10" data-id="completed-trick-hold">
      <StaticSlot className="top-[36%] left-1/2 -translate-x-1/2" card={trickBySeat.get(seats.top)} dataId="held-top" />
      <StaticSlot className="top-[45%] left-[27%]" card={trickBySeat.get(seats.left)} dataId="held-left" />
      <StaticSlot className="top-[45%] right-[27%]" card={trickBySeat.get(seats.right)} dataId="held-right" />
      <StaticSlot
        className="bottom-[25%] left-1/2 -translate-x-1/2"
        card={trickBySeat.get(seats.bottom)}
        dataId="held-bottom"
      />
    </div>
  );
}

function StaticSlot({ className, card, dataId }: { className: string; card?: Card; dataId: string }) {
  if (!card) return null;
  return (
    <div className={`absolute ${className}`} data-id={`${dataId}-slot`}>
      <PlayingCard card={card} size="lg" dataId={dataId} />
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
    return <div className="h-24 w-16 rounded-xl bg-emerald-950/5" data-id={dataId} />;
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

function CardBackFanH({ count }: { count: number }) {
  const n = Math.min(count, 8);
  if (n === 0) return <div className="h-20 w-14" />;
  return (
    <div className="relative h-24 w-48">
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="absolute bottom-0"
          style={{
            left: n > 1 ? `calc(${i} * (100% - 56px) / ${n - 1})` : "calc(50% - 28px)",
            zIndex: i,
          }}
        >
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
