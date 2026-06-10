"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Difficulty } from "@/lib/coinche";
import { difficultyLabel, useI18n } from "@/lib/client/i18n";

const TARGETS = [500, 1000, 1500, 2000];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function LocalSetupPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [target, setTarget] = useState(1000);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [countContractOnlyIfMade, setCountContractOnlyIfMade] = useState(false);
  const [failedContractDefensePoints, setFailedContractDefensePoints] = useState("160");
  const [zeroPointsForNonContractingTeamWhenContractMade, setZeroPointsForNonContractingTeamWhenContractMade] =
    useState(true);
  const [capotMadePoints, setCapotMadePoints] = useState("250");
  const [capotFailedDefensePoints, setCapotFailedDefensePoints] = useState("250");

  function startLocalGame() {
    const params = new URLSearchParams({
      target: String(target),
      difficulty,
      countContractOnlyIfMade: String(countContractOnlyIfMade),
      failedContractDefensePoints,
      zeroPointsForNonContractingTeamWhenContractMade: String(zeroPointsForNonContractingTeamWhenContractMade),
      capotMadePoints,
      capotFailedDefensePoints,
    });
    router.push(`/local/play?${params.toString()}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="local-setup-screen">
      <Link href="/" className="text-sm text-[var(--foreground)]/70" data-id="local-back-home">
        ← {t("backToDashboard")}
      </Link>

      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-[var(--surface)]">{t("playLocal")}</h1>
        <p className="text-sm text-[var(--foreground)]/75">{t("localSubtitle")}</p>
      </header>

      <section className="grid gap-3" data-id="local-actions-card">
        <button
          data-id="local-start-button"
          onClick={startLocalGame}
          className="rounded-2xl bg-[var(--accent-yellow)] px-4 py-4 text-lg font-black text-[var(--surface)] shadow-lg"
        >
          {t("start")}
        </button>
      </section>

      <section className="rounded-2xl bg-[var(--surface)] p-5 text-[var(--card-face)] shadow-lg ring-1 ring-[var(--accent-cyan)]/25" data-id="local-settings-card">
        <h2 className="mb-3 text-lg font-bold">{t("settings")}</h2>
        <div className="grid grid-cols-1 gap-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--card-face)]/75">{t("pointsCount")}</span>
            <select
              data-id="local-target-select"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            >
              {TARGETS.map((points) => (
                <option key={points} value={points}>
                  {points} points
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--card-face)]/75">{t("bots")}</span>
            <select
              data-id="local-difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            >
              {DIFFICULTIES.map((item) => (
                <option key={item} value={item}>
                  {difficultyLabel(item, locale)}
                </option>
              ))}
            </select>
          </label>
          <label
            className="flex items-center justify-between gap-3 text-sm"
            data-id="local-count-contract-only-checkbox-row"
          >
            <span className="text-[var(--card-face)]/75">{t("localOnlyContractPoints")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={countContractOnlyIfMade}
              data-id="local-count-contract-only-checkbox"
              onClick={() => setCountContractOnlyIfMade((v) => !v)}
              className={[
                "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                countContractOnlyIfMade ? "bg-[var(--accent-yellow)]" : "bg-[var(--card-face)]/20",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  countContractOnlyIfMade ? "translate-x-5" : "translate-x-0.5",
                ].join(" ")}
              />
            </button>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--card-face)]/75">{t("failedContract")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              data-id="local-failed-contract-points-input"
              value={failedContractDefensePoints}
              onChange={(e) => setFailedContractDefensePoints(e.target.value)}
              placeholder="160"
              className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--card-face)]/75">{t("capot")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              data-id="local-capot-made-points-input"
              value={capotMadePoints}
              onChange={(e) => setCapotMadePoints(e.target.value)}
              placeholder="250"
              className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--card-face)]/75">{t("failedCapot")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              data-id="local-capot-failed-defense-points-input"
              value={capotFailedDefensePoints}
              onChange={(e) => setCapotFailedDefensePoints(e.target.value)}
              placeholder="250"
              className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--card-face)]/75">{t("opponentPoints")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!zeroPointsForNonContractingTeamWhenContractMade}
              data-id="local-opponent-points-switch"
              onClick={() => setZeroPointsForNonContractingTeamWhenContractMade((v) => !v)}
              className={[
                "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                !zeroPointsForNonContractingTeamWhenContractMade
                  ? "bg-[var(--accent-yellow)]"
                  : "bg-[var(--card-face)]/20",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  !zeroPointsForNonContractingTeamWhenContractMade ? "translate-x-5" : "translate-x-0.5",
                ].join(" ")}
              />
            </button>
          </label>
        </div>
      </section>
    </main>
  );
}
