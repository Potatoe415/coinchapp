"use client";

import React, { useEffect, useRef, useState } from "react";
import { CAPOT_VALUE, GENERALE_VALUE, type Bid, type Card, type PlayerView } from "@/lib/coinche";
import type { GameView, NextDealGate } from "@/lib/server/view";
import { DealOverlay } from "./DealOverlay";
import type { EmojiReaction } from "./EmojiButton";
import { isConnected, playerName, seatTeam } from "./gameTableHelpers";
import { trumpModeLabel } from "./labels";
import { PlayerBadge } from "./PlayerBadge";
import { CardBackFanH, CardBackStackV, CompletedTrickHold, PlayedCardStage, type TableSeats } from "./TrickStage";

function isSeatThinking(view: PlayerView, seat: number): boolean {
  if (view.phase !== "bidding" && view.phase !== "playing") return false;
  if (view.turn !== seat) return false;
  return true;
}

function lastSeatBid(bids: Bid[], seat: number): Bid | null {
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].seat === seat) return bids[i];
  }
  return null;
}

function bidBubbleText(bid: Bid): string {
  if (bid.type === "pass") return "Passe";
  if (bid.type === "coinche") return "Coinche !";
  if (bid.type === "surcoinche") return "Surcoinche !";
  const val = bid.value === CAPOT_VALUE ? "Capot" : bid.value === GENERALE_VALUE ? "Générale" : String(bid.value);
  return `${val}${bid.suit ? ` ${trumpModeLabel(bid.suit)}` : ""}`;
}

function bubbleColors(bid: Bid): { bg: string; color: string } {
  if (bid.type === "pass") return { bg: "rgba(255,255,255,0.55)", color: "rgba(180,180,180,0.9)" };
  if (bid.type === "coinche") return { bg: "#fef3c7", color: "#b45309" };
  if (bid.type === "surcoinche") return { bg: "#fee2e2", color: "#b91c1c" };
  if (bid.suit === "H" || bid.suit === "D") return { bg: "#fff", color: "#dc2626" };
  return { bg: "#fff", color: "#1e293b" };
}

function BidBubble({ bid, tailDir }: { bid: Bid; tailDir: "up" | "left" | "right" }) {
  const { bg, color } = bubbleColors(bid);
  const text = bidBubbleText(bid);
  const tailH: React.CSSProperties = { width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent" };
  const tailV: React.CSSProperties = { width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent" };
  return (
    <div
      style={{ display: "flex", flexDirection: tailDir === "up" ? "column" : "row", alignItems: "center", gap: 0 }}
      data-id="bid-bubble"
    >
      {tailDir === "up" && (
        <div style={{ ...tailV, borderBottom: `6px solid ${bg}`, alignSelf: "center" }} />
      )}
      {tailDir === "left" && (
        <div style={{ ...tailH, borderRight: `6px solid ${bg}` }} />
      )}
      <div
        style={{
          background: bg, color, borderRadius: "0.65rem",
          padding: "2px 7px", fontSize: "0.7rem", fontWeight: 900,
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)", whiteSpace: "nowrap",
          border: `1.5px solid rgba(0,0,0,0.10)`,
        }}
      >
        {text}
      </div>
      {tailDir === "right" && (
        <div style={{ ...tailH, borderLeft: `6px solid ${bg}` }} />
      )}
    </div>
  );
}

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
  nextDealGate,
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
  nextDealGate?: NextDealGate;
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
      <DealOverlay view={view} onNextDeal={onNextDeal} nextDealGate={nextDealGate} />
    </section>
  );
}

function TopOpponent({ gv, view, seat, reaction }: { gv: GameView; view: PlayerView; seat: number; reaction?: EmojiReaction }) {
  const bid = view.phase === "bidding" ? lastSeatBid(view.bids, seat) : null;
  return (
    // z-30: sits above the end-of-deal overlay (z-20, DealOverlay) so this seat's
    // emoji reaction stays visible while the score recap is shown.
    <div className="absolute left-1/2 top-[13%] z-30 flex -translate-x-1/2 flex-col items-center" data-id="table-top">
      <CardBackFanH count={view.handCounts[seat]} />
      <div className="mt-2 flex flex-row items-center gap-1" data-id="table-top-badge-wrap">
        <PlayerBadge
          name={playerName(gv, seat)}
          team={seatTeam(seat)}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
          isThinking={isSeatThinking(view, seat)}
          connected={isConnected(gv, seat)}
          reaction={reaction}
          dataId={`player-seat-${seat}`}
        />
        {bid && <BidBubble bid={bid} tailDir="left" />}
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
  const bid = view.phase === "bidding" ? lastSeatBid(view.bids, seat) : null;
  // With flex-row-reverse (right side), the bubble added last renders leftmost (toward center).
  // With flex-row (left side), the bubble added last renders rightmost (toward center).
  const tailDir = side === "left" ? "left" : "right";
  return (
    // z-30: see TopOpponent above - keeps this seat's emoji reaction visible over the deal overlay.
    <div className={`absolute top-[41%] z-30 flex items-center gap-0 ${sideClass}`} data-id={`table-${side}`}>
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
          connected={isConnected(gv, seat)}
          reaction={reaction}
          orientation="vertical"
          dataId={`player-seat-${seat}`}
        />
      </div>
      {bid && <BidBubble bid={bid} tailDir={tailDir} />}
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

