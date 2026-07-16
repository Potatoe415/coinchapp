"use client";

import { useI18n } from "@/lib/client/i18n";
import { useP2PClient } from "@/lib/client/useP2PClient";
import type { P2PConnection } from "@/lib/client/p2p/connection";
import { GameTable, type CoincheGameView } from "@/components/GameTable";
import { BouillaTable, type BouillaGameView } from "@/components/BouillaTable";

/** Renders the table for a joining client once the host streams its first view. */
export function P2PClientGame({ conn, name }: { conn: P2PConnection; name: string }) {
  const { t } = useI18n();
  const { gv, actions } = useP2PClient(conn, name);

  if (!gv || !gv.view || gv.mySeat === null) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white"
        data-id="adhoc-client-waiting"
      >
        {t("waitingForHost")}
      </div>
    );
  }
  if (gv.gameType === "bouilla") {
    return <BouillaTable gv={gv as BouillaGameView} actions={{ onPlay: actions.onPlay, onNextRound: actions.onNextDeal }} />;
  }
  return <GameTable gv={gv as CoincheGameView} actions={actions} />;
}
