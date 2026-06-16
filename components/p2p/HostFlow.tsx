"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import type { Seat } from "@/lib/coinche";
import { createP2PConnection, type P2PConnection } from "@/lib/client/p2p/connection";
import { decodeSignal, encodeSignal } from "@/lib/client/p2p/signaling";
import { QrCode, QrPaste, QrScanner } from "./QrExchange";

/**
 * Host side: connect each human opponent seat one at a time. For every seat we
 * show an offer QR, the client scans it and shows an answer QR back, which we
 * scan here. Once all human seats are connected we hand the live connections up.
 */
export function HostFlow({
  humanSeats,
  onReady,
}: {
  humanSeats: Seat[];
  onReady: (conns: Map<Seat, P2PConnection>) => void;
}) {
  const { t } = useI18n();
  const connsRef = useRef<Map<Seat, P2PConnection>>(new Map());
  const pendingRef = useRef<P2PConnection | null>(null);
  const startedRef = useRef(-1);
  const doneRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [offer, setOffer] = useState<string | null>(null);

  const startSeat = useCallback(async (seat: Seat) => {
    setOffer(null);
    const conn = createP2PConnection();
    pendingRef.current = conn;
    conn.onOpen(() => {
      connsRef.current.set(seat, conn);
      setIndex((i) => i + 1);
    });
    const offerSdp = await conn.createOffer();
    setOffer(await encodeSignal(offerSdp));
  }, []);

  const handleAnswer = useCallback(async (raw: string) => {
    const conn = pendingRef.current;
    if (!conn) return;
    await conn.acceptAnswer(await decodeSignal(raw));
  }, []);

  useEffect(() => {
    if (index >= humanSeats.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onReady(connsRef.current);
      }
      return;
    }
    if (startedRef.current === index) return;
    startedRef.current = index;
    void startSeat(humanSeats[index]);
  }, [index, humanSeats, onReady, startSeat]);

  if (index >= humanSeats.length) {
    return (
      <p className="text-center text-white/80" data-id="adhoc-host-starting">
        {t("startGame")}…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-id="adhoc-host-invite">
      <p className="text-sm font-bold text-white/90">
        {t("inviteOpponent")} {index + 1}/{humanSeats.length}
      </p>
      {offer ? (
        <>
          <p className="text-sm text-white/80">{t("showThisQr")}</p>
          <div className="flex justify-center">
            <QrCode value={offer} />
          </div>
          <p className="text-sm text-white/80">{t("scanAnswerQr")}</p>
          <QrScanner onScan={(text) => void handleAnswer(text)} />
          <QrPaste onSubmit={(text) => void handleAnswer(text)} label={t("pasteAnswerCode")} />
        </>
      ) : (
        <p className="text-white/70" data-id="adhoc-host-preparing">
          {t("loading")}
        </p>
      )}
    </div>
  );
}
