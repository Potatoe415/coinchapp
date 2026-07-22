"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatText, useI18n } from "@/lib/client/i18n";
import type { Seat } from "@/lib/coinche";
import type { GameSettings } from "@/lib/supabase/types";
import type { P2PConnection } from "@/lib/client/p2p/connection";
import type { P2PHostConfig } from "@/lib/client/useP2PHost";
import type { P2PBouillaHostConfig } from "@/lib/client/useP2PBouillaHost";
import type { RosterEntry } from "@/lib/client/p2p/protocol";
import {
  GameSettingsPanel,
  DEFAULT_GAME_SETUP,
  type GameSetupValues,
} from "@/components/GameSettingsPanel";
import { HostFlow } from "@/components/p2p/HostFlow";
import { JoinFlow } from "@/components/p2p/JoinFlow";
import { P2PHostGame } from "@/components/p2p/P2PHostGame";
import { P2PBouillaHostGame } from "@/components/p2p/P2PBouillaHostGame";
import { P2PClientGame } from "@/components/p2p/P2PClientGame";

const BOT_NAMES = ["", "Adam", "Jane", "Léa"];

type Phase = "choose" | "host-setup" | "host-connect" | "host-play" | "join" | "join-play";

function toSettings(v: GameSetupValues): GameSettings {
  return {
    targetPoints: v.target,
    countContractOnlyIfMade: v.countContractOnlyIfMade,
    failedContractDefensePoints: Number(v.failedContractDefensePoints) || 160,
    zeroPointsForNonContractingTeamWhenContractMade: v.zeroPointsForNonContractingTeamWhenContractMade,
    capotMadePoints: Number(v.capotMadePoints) || 250,
    capotFailedDefensePoints: Number(v.capotFailedDefensePoints) || 250,
    allowToutAtoutSansAtout: v.allowToutAtoutSansAtout,
    requireMorePointsToWin: v.requireMorePointsToWin,
    botPunch: v.botPunch,
    botThinkMs: v.botThinkMs,
  };
}

function buildRoster(hostName: string, humanCount: number, youName: string, playerNameTemplate: string): RosterEntry[] {
  const roster: RosterEntry[] = [{ seat: 0, displayName: hostName || youName, isBot: false }];
  for (let seat = 1; seat <= 3; seat++) {
    const human = seat <= humanCount;
    roster.push({
      seat: seat as Seat,
      displayName: human ? formatText(playerNameTemplate, { seat: seat + 1 }) : BOT_NAMES[seat],
      isBot: !human,
    });
  }
  return roster;
}

export function AdHocLobby() {
  const { t } = useI18n();
  const isBouilla = useSearchParams().get("game") === "bouilla";
  const [phase, setPhase] = useState<Phase>("choose");
  const [name, setName] = useState("");
  const [humanCount, setHumanCount] = useState(1);
  const [setup, setSetup] = useState<GameSetupValues>(DEFAULT_GAME_SETUP);
  const [seed] = useState(() => (Math.random() * 0x100000000) >>> 0);
  const [hostConfig, setHostConfig] = useState<P2PHostConfig | null>(null);
  const [bouillaHostConfig, setBouillaHostConfig] = useState<P2PBouillaHostConfig | null>(null);
  const [client, setClient] = useState<{ conn: P2PConnection; name: string } | null>(null);

  const humanSeats = useMemo(
    () => Array.from({ length: humanCount }, (_, i) => (i + 1) as Seat),
    [humanCount],
  );

  const onHostReady = useCallback(
    (conns: Map<Seat, P2PConnection>) => {
      const roster = buildRoster(name, humanCount, t("defaultYouName"), t("defaultPlayerName"));
      if (isBouilla) {
        setBouillaHostConfig({ mySeat: 0, roster, connections: conns, seed, botThinkMs: setup.botThinkMs });
      } else {
        setHostConfig({ mySeat: 0, roster, connections: conns, settings: toSettings(setup), seed });
      }
      setPhase("host-play");
    },
    [name, humanCount, setup, seed, isBouilla, t],
  );

  if (phase === "host-play" && hostConfig) return <P2PHostGame config={hostConfig} />;
  if (phase === "host-play" && bouillaHostConfig) return <P2PBouillaHostGame config={bouillaHostConfig} />;
  if (phase === "join-play" && client) return <P2PClientGame conn={client.conn} name={client.name} />;

  return (
    <Shell isBouilla={isBouilla}>
      {phase === "choose" && <ChooseMode t={t} setPhase={setPhase} />}
      {phase === "host-setup" && (
        <div className="flex flex-col gap-4" data-id="adhoc-host-setup">
          <input
            data-id="adhoc-host-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("pseudo")}
            className="rounded-lg bg-white/10 px-4 py-3 text-white placeholder-white/50"
          />
          <OpponentCount t={t} value={humanCount} onChange={setHumanCount} />
          <button
            data-id="adhoc-invite-button"
            onClick={() => setPhase("host-connect")}
            className="rounded-2xl bg-[var(--accent-yellow)] px-4 py-4 text-lg font-black text-[var(--surface)] shadow-lg"
          >
            {t("inviteOpponents")}
          </button>
          <GameSettingsPanel
            values={setup}
            onChange={setSetup}
            idPrefix="adhoc"
            title={t("settings")}
            coincheFields={!isBouilla}
          />
        </div>
      )}
      {phase === "host-connect" && <HostFlow humanSeats={humanSeats} onReady={onHostReady} />}
      {phase === "join" && (
        <JoinFlow
          onConnected={(conn, clientName) => {
            setClient({ conn, name: clientName });
            setPhase("join-play");
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children, isBouilla }: { children: React.ReactNode; isBouilla: boolean }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 bg-felt px-5 py-8" data-id="adhoc-screen">
      <Link
        href="/"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
        data-id="adhoc-back-home"
        aria-label={t("backHome")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
      </Link>
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-white" data-id="adhoc-title">
          {isBouilla ? t("bouillaAdhocTitle") : t("playAdhoc")}
        </h1>
        <p className="text-sm text-white/70">
          {isBouilla ? t("bouillaAdhocSubtitle") : t("adhocSubtitle")}
        </p>
      </header>
      {children}
    </main>
  );
}

function ChooseMode({
  t,
  setPhase,
}: {
  t: (k: "hostGame" | "joinGame") => string;
  setPhase: (p: Phase) => void;
}) {
  return (
    <div className="flex flex-col gap-3" data-id="adhoc-choose">
      <button
        data-id="adhoc-host-mode-button"
        onClick={() => setPhase("host-setup")}
        className="rounded-2xl bg-[var(--accent-yellow)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
      >
        {t("hostGame")}
      </button>
      <button
        data-id="adhoc-join-mode-button"
        onClick={() => setPhase("join")}
        className="rounded-2xl bg-[var(--accent-cyan)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
      >
        {t("joinGame")}
      </button>
    </div>
  );
}

function OpponentCount({
  t,
  value,
  onChange,
}: {
  t: (k: "humanOpponents") => string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-id="adhoc-opponent-count">
      <span className="text-sm text-white/75">{t("humanOpponents")}</span>
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            data-id={`adhoc-opponent-count-${n}`}
            onClick={() => onChange(n)}
            className={[
              "flex-1 rounded-xl px-4 py-3 font-bold",
              value === n
                ? "bg-[var(--accent-yellow)] text-[var(--surface)]"
                : "bg-white/10 text-white",
            ].join(" ")}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
