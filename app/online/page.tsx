"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createGame, joinGame } from "@/lib/server/actions-lobby";
import { ensureAnonAuth } from "@/lib/client/auth";
import { useI18n } from "@/lib/client/i18n";
import { GameSettingsPanel, DEFAULT_GAME_SETUP } from "@/components/GameSettingsPanel";
import type { GameSetupValues } from "@/components/GameSettingsPanel";

const ROOM_CODE_LENGTH = 3;

export default function OnlinePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [setup, setSetup] = useState<GameSetupValues>(DEFAULT_GAME_SETUP);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    if (!fromUrl) return;
    // Post-hydration browser read: deferred to after mount to avoid an SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH));
  }, []);

  async function run(action: () => Promise<{ gameId: string; roomCode?: string }>) {
    setBusy(true);
    setError(null);
    try {
      await ensureAnonAuth();
      const { gameId, roomCode } = await action();
      router.push(`/game/${roomCode ?? gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="online-screen">
      <Link
        href="/"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--foreground)]/10 text-[var(--foreground)]/70 transition-colors hover:bg-[var(--foreground)]/20"
        data-id="online-back-home"
        aria-label={t("backToDashboard")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </Link>

      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-[var(--surface)]">{t("playOnline")}</h1>
        <p className="text-sm text-[var(--foreground)]/75">{t("onlineSubtitle")}</p>
      </header>

      {error && (
        <p
          className="rounded-lg bg-[var(--accent-red)]/20 px-4 py-2 text-center text-sm text-[var(--surface)]"
          data-id="online-error"
        >
          {error}
        </p>
      )}

      <section
        className="rounded-2xl bg-[var(--surface)] p-5 text-[var(--card-face)] shadow-lg ring-1 ring-[var(--accent-cyan)]/25"
        data-id="online-actions-card"
      >
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-[var(--card-face)]/75">{t("yourName")}</span>
          <input
            data-id="online-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("pseudo")}
            className="w-full rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 text-[var(--card-face)] outline-none ring-1 ring-[var(--accent-cyan)]/25 focus:ring-[var(--accent-yellow)]"
          />
        </label>
        <button
          data-id="create-game-button"
          disabled={busy}
          onClick={() =>
            run(() =>
              createGame({
                displayName: name,
                settings: {
                  targetPoints: setup.target,
                  countContractOnlyIfMade: setup.countContractOnlyIfMade,
                  failedContractDefensePoints: Number(setup.failedContractDefensePoints) || 160,
                  zeroPointsForNonContractingTeamWhenContractMade: setup.zeroPointsForNonContractingTeamWhenContractMade,
                  capotMadePoints: Number(setup.capotMadePoints) || 250,
                  capotFailedDefensePoints: Number(setup.capotFailedDefensePoints) || 250,
                  allowToutAtoutSansAtout: setup.allowToutAtoutSansAtout,
                  requireMorePointsToWin: setup.requireMorePointsToWin,
                  botPunch: setup.botPunch,
                },
              }),
            )
          }
          className="mb-4 w-full rounded-lg bg-[var(--accent-cyan)] px-4 py-3 font-bold text-[var(--surface)] disabled:opacity-50"
        >
          {t("createOnlineGame")}
        </button>
        <div className="flex gap-3">
          <input
            data-id="join-code-input"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH))
            }
            placeholder="CODE"
            maxLength={ROOM_CODE_LENGTH}
            className="w-32 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 text-center font-mono text-lg tracking-widest text-[var(--card-face)] outline-none ring-1 ring-[var(--accent-cyan)]/25 focus:ring-[var(--accent-yellow)]"
          />
          <button
            data-id="join-game-button"
            disabled={busy || code.length !== ROOM_CODE_LENGTH}
            onClick={() =>
              run(async () => {
                const joined = await joinGame({ roomCode: code, displayName: name });
                return { ...joined, roomCode: code };
              })
            }
            className="flex-1 rounded-lg bg-[rgba(255,250,242,0.16)] px-4 py-3 font-bold disabled:opacity-50"
          >
            {t("join")}
          </button>
        </div>
      </section>

      <GameSettingsPanel
        values={setup}
        onChange={setSetup}
        idPrefix="online"
        title={t("gameSettings")}
      />
    </main>
  );
}
