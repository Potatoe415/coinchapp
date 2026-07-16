"use client";

import { useP2PBouillaHost, type P2PBouillaHostConfig } from "@/lib/client/useP2PBouillaHost";
import { BouillaTable, type BouillaGameView } from "@/components/BouillaTable";

/** Renders the table for the authoritative host of a Bouilla ad-hoc table (also a player). */
export function P2PBouillaHostGame({ config }: { config: P2PBouillaHostConfig }) {
  const { gv, actions } = useP2PBouillaHost(config);
  return <BouillaTable gv={gv as BouillaGameView} actions={actions} />;
}
