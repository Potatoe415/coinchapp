"use client";

import { useP2PPresidentHost, type P2PPresidentHostConfig } from "@/lib/client/useP2PPresidentHost";
import { PresidentTable, type PresidentGameView } from "@/components/PresidentTable";

/** Renders the table for the authoritative host of a Président ad-hoc table (also a player). */
export function P2PPresidentHostGame({ config }: { config: P2PPresidentHostConfig }) {
  const { gv, actions } = useP2PPresidentHost(config);
  return <PresidentTable gv={gv as PresidentGameView} actions={actions} />;
}
