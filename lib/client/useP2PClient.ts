"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/coinche";
import type { GameActions } from "@/components/GameTable";
import type { GameView } from "@/lib/server/view";
import type { P2PConnection } from "./p2p/connection";
import { parseHostMessage, type ClientMessage } from "./p2p/protocol";

/**
 * Light client: receives its redacted GameView from the host over the data
 * channel and sends back its own seat's moves. Produces the same
 * GameView/GameActions contract as the other producers, so GameTable renders
 * unchanged. Returns gv=null until the first view arrives.
 */
export function useP2PClient(
  conn: P2PConnection,
  name: string,
): { gv: GameView | null; connected: boolean } & { actions: GameActions } {
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

  const actions: GameActions = useMemo(
    () => ({
      onBid: (payload) => send({ t: "bid", payload }),
      onPlay: (card: Card) => send({ t: "play", card }),
      onNextDeal: () => send({ t: "nextDeal" }),
    }),
    [send],
  );

  return { gv, connected: gv !== null, actions };
}
