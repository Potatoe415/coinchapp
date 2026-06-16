"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { createP2PConnection, type P2PConnection } from "@/lib/client/p2p/connection";
import { decodeSignal, encodeSignal } from "@/lib/client/p2p/signaling";
import { QrCode, QrPaste, QrScanner } from "./QrExchange";

type Step = "name" | "scan" | "answer";

/** Client side: enter a name, scan the host's offer, show the answer back. */
export function JoinFlow({ onConnected }: { onConnected: (conn: P2PConnection, name: string) => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const connRef = useRef<P2PConnection | null>(null);
  const doneRef = useRef(false);

  const handleOffer = useCallback(
    async (raw: string) => {
      if (connRef.current) return;
      const conn = createP2PConnection();
      connRef.current = conn;
      conn.onOpen(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onConnected(conn, name.trim());
      });
      const offerSdp = await decodeSignal(raw);
      const answerSdp = await conn.acceptOffer(offerSdp);
      setAnswer(await encodeSignal(answerSdp));
      setStep("answer");
    },
    [name, onConnected],
  );

  if (step === "name") {
    return (
      <div className="flex flex-col gap-3" data-id="adhoc-join-name">
        <input
          data-id="adhoc-join-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("pseudo")}
          className="rounded-lg bg-white/10 px-4 py-3 text-white placeholder-white/50"
        />
        <button
          data-id="adhoc-join-start-scan"
          disabled={name.trim().length === 0}
          onClick={() => setStep("scan")}
          className="rounded-xl bg-[var(--accent-cyan)] px-4 py-3 font-bold text-[var(--surface)] disabled:opacity-40"
        >
          {t("scanHostQr")}
        </button>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="flex flex-col gap-3" data-id="adhoc-join-scan">
        <p className="text-sm text-white/80">{t("scanHostQr")}</p>
        <QrScanner onScan={(text) => void handleOffer(text)} />
        <QrPaste onSubmit={(text) => void handleOffer(text)} label={t("pasteHostCode")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3" data-id="adhoc-join-answer">
      <p className="text-sm text-white/80">{t("showAnswerToHost")}</p>
      <QrCode value={answer} />
      <p className="text-sm text-white/60" data-id="adhoc-join-waiting">
        {t("waitingForHost")}
      </p>
    </div>
  );
}
