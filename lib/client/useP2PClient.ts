"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BidPayload } from "@/components/BiddingPanel";
import type { GameView } from "@/lib/server/view";
import type { P2PConnection } from "./p2p/connection";
import { parseHostMessage, type ClientMessage, type WireCard } from "./p2p/protocol";

/** Client-side move senders, loosely typed at the transport boundary (see `WireCard`).
 *  Both `GameTable` (Coinche) and `BouillaTable` build their own actions object from these. */
export interface P2PClientActions {
  onBid: (payload: BidPayload) => void;
  onPlay: (card: WireCard) => void;
  onNextDeal: () => void;
}

/**
 * Light client: receives its redacted GameView from the host over the data
 * channel and sends back its own seat's moves. Returns gv=null until the
 * first view arrives.
 */
export function useP2PClient(
  conn: P2PConnection,
  name: string,
): { gv: GameView | null; connected: boolean; actions: P2PClientActions } {
  const [gv, setGv] = useState<GameView | null>(null);
  const connRef = useRef(conn);

  const send = useCallback((msg: ClientMessage) => {
    connRef.current.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    const c = connRef.current;
    c.onMessage((raw) => {
      const msg = parseHostMessage(raw);
      if (msg?.t === "view") setGv(msg.view);
    });
    send({ t: "hello", name });
  }, [name, send]);

  const actions: P2PClientActions = useMemo(
    () => ({
      onBid: (payload) => send({ t: "bid", payload }),
      onPlay: (card: WireCard) => send({ t: "play", card }),
      onNextDeal: () => send({ t: "nextDeal" }),
    }),
    [send],
  );

  return { gv, connected: gv !== null, actions };
}
