"use client";

import { useP2PHost, type P2PHostConfig } from "@/lib/client/useP2PHost";
import { GameTable } from "@/components/GameTable";

/** Renders the table for the authoritative host (also a player). */
export function P2PHostGame({ config }: { config: P2PHostConfig }) {
  const { gv, actions } = useP2PHost(config);
  return <GameTable gv={gv} actions={actions} />;
}
