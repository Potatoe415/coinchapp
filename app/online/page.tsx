"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createGame, joinGame } from "@/lib/server/actions-lobby";
import { ensureAnonAuth } from "@/lib/client/auth";
import type { Difficulty } from "@/lib/coinche";
import { difficultyLabel, useI18n } from "@/lib/client/i18n";

const TARGETS = [500, 1000, 1500, 2000];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const ROOM_CODE_LENGTH = 3;

export default function OnlinePage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [name, setName] = useState("");
  const [target, setTarget] = useState(1000);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [capotMadePoints, setCapotMadePoints] = useState("250");
  const [capotFailedDefensePoints, setCapotFailedDefensePoints] = useState("250");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    if (fromUrl) {
      setCode(fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH));
    }
  }, []);

  async function run(action: () => Promise<{ gameId: string }>) {
    setBusy(true);
    setError(null);
    try {
      await ensureAnonAuth();
      const { gameId } = await action();
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="online-screen">
      <Link href="/" className="text-sm text-[var(--foreground)]/70" data-id="online-back-home">
        ← {t("backToDashboard")}
      </Link>

      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-[var(--surface)]">{t("playOnline")}</h1>
        <p className="text-sm text-[var(--foreground)]/75">{t("onlineSubtitle")}</p>
      </header>

      {error && (
        <p className="rounded-lg bg-[var(--accent-red)]/20 px-4 py-2 text-center text-sm text-[var(--surface)]" data-id="online-error">
          {error}
        </p>
      )}

      <section className="rounded-2xl bg-[var(--surface)] p-5 text-[var(--card-face)] shadow-lg ring-1 ring-[var(--accent-cyan)]/25" data-id="online-settings-card">
        <h2 className="mb-3 text-lg font-bold">{t("gameSettings")}</h2>
        <div className="grid gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--card-face)]/75">{t("pointsCount")}</span>
            <select
              data-id="online-target-select"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            >
              {TARGETS.map((points) => (
                <option key={points} value={points}>
                  {points} points
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--card-face)]/75">{t("bots")}</span>
            <select
              data-id="online-difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            >
              {DIFFICULTIES.map((item) => (
                <option key={item} value={item}>
                  {difficultyLabel(item, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--card-face)]/75">{t("capot")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              data-id="online-capot-made-points-input"
              value={capotMadePoints}
              onChange={(e) => setCapotMadePoints(e.target.value)}
              placeholder="250"
              className="w-full rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--card-face)]/75">{t("failedCapot")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              data-id="online-capot-failed-defense-points-input"
              value={capotFailedDefensePoints}
              onChange={(e) => setCapotFailedDefensePoints(e.target.value)}
              placeholder="250"
              className="w-full rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--surface)] p-5 text-[var(--card-face)] shadow-lg ring-1 ring-[var(--accent-cyan)]/25" data-id="online-actions-card">
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
            run(() => createGame({
              displayName: name,
              settings: {
                targetPoints: target,
                botDifficulty: difficulty,
                capotMadePoints: Number(capotMadePoints) || 250,
                capotFailedDefensePoints: Number(capotFailedDefensePoints) || 250,
              },
            }))
          }
          className="mb-4 w-full rounded-lg bg-[var(--accent-cyan)] px-4 py-3 font-bold text-[var(--surface)] disabled:opacity-50"
        >
          {t("createOnlineGame")}
        </button>
        <div className="flex gap-3">
          <input
            data-id="join-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH))}
            placeholder="CODE"
            maxLength={ROOM_CODE_LENGTH}
            className="w-32 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 text-center font-mono text-lg tracking-widest text-[var(--card-face)] outline-none ring-1 ring-[var(--accent-cyan)]/25 focus:ring-[var(--accent-yellow)]"
          />
          <button
            data-id="join-game-button"
            disabled={busy || code.length !== ROOM_CODE_LENGTH}
            onClick={() => run(() => joinGame({ roomCode: code, displayName: name }))}
            className="flex-1 rounded-lg bg-[rgba(255,250,242,0.16)] px-4 py-3 font-bold disabled:opacity-50"
          >
            {t("join")}
          </button>
        </div>
      </section>
    </main>
  );
}
