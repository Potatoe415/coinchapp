"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatText, useI18n } from "@/lib/client/i18n";
import type { PlayerView } from "@/lib/coinche";
import type { NextDealGate } from "@/lib/server/view";
import { formatContract } from "./labels";

export function DealOverlay({
  view,
  onNextDeal,
  nextDealGate,
}: {
  view: PlayerView;
  onNextDeal: () => Promise<void> | void;
  nextDealGate?: NextDealGate;
}) {
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const result = view.lastDeal;
  const finished = view.phase === "finished";
  const shouldShow = !!result || finished;

  const [visible, setVisible] = useState(false);
  const [prevShouldShow, setPrevShouldShow] = useState(shouldShow);
  if (shouldShow !== prevShouldShow) {
    setPrevShouldShow(shouldShow);
    if (!shouldShow) setVisible(false);
  }
  useEffect(() => {
    if (!shouldShow) return;
    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, [shouldShow]);

  if (!visible) return null;

  const contractMade = result?.contractMade ?? true;
  const myTeam = view.mySeat % 2 === 0 ? "A" : "B";
  const iWon = result
    ? (myTeam === result.contract.team) === result.contractMade
    : true;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-overlay)] px-6" data-id="deal-overlay">
      {!finished && (iWon ? <Fireworks /> : <Skulls />)}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--surface)] p-6 text-center text-[var(--card-face)] ring-1 ring-[var(--accent-cyan)]/30">
        {finished ? (
          <>
            <h2 className="text-2xl font-black text-[var(--accent-yellow)]" data-id="game-winner">
              {formatText(t("winnerTeam"), { team: view.winner ?? "" })}
            </h2>
            <p className="mt-2 text-[var(--card-face)]/80">
              {formatText(t("finalScore"), { a: view.scores.A, b: view.scores.B })}
            </p>
            <Link
              href="/"
              data-id="finished-home-button"
              className="mt-5 inline-block rounded-lg bg-[var(--accent-yellow)] px-5 py-2.5 font-bold text-[var(--surface)]"
            >
              {t("newGame")}
            </Link>
          </>
        ) : (
          result && (
            <>
              <h2
                data-id="deal-result-title"
                className={`text-4xl font-black tracking-wide ${iWon ? "text-[var(--accent-green)]" : "text-red-500"}`}
              >
                {myTeam === result.contract.team
                  ? (iWon ? "Gagné!!!" : "Chuté!!!")
                  : (iWon ? "Belle défense!!!" : "Ay Caramba!!!")}
              </h2>
              <p className="mt-1 text-sm text-[var(--card-face)]/70">
                {formatText(t(result.contractMade ? "contractMadeByTeam" : "contractFailedByTeam"), {
                  contract: formatContract(result.contract, locale),
                  team: result.contract.team,
                })}
                {result.capot && ` · ${t("capot")}`}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <ScoreCell team="A" cardPoints={result.cardPoints.A} gained={result.gained.A} total={view.scores.A} />
                <ScoreCell team="B" cardPoints={result.cardPoints.B} gained={result.gained.B} total={view.scores.B} />
              </div>
              <button
                data-id="next-deal-button"
                disabled={busy || (nextDealGate?.iAmReady ?? false)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onNextDeal();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-5 w-full rounded-lg bg-[var(--accent-cyan)] px-5 py-2.5 font-bold text-[var(--surface)] disabled:opacity-50"
              >
                {nextDealGate?.iAmReady
                  ? formatText(t("waitingPlayersReady"), {
                      ready: nextDealGate.readyCount,
                      total: nextDealGate.humanCount,
                    })
                  : t("nextDeal")}
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}

// ─── Fireworks (canvas particle bursts) ──────────────────────────────────────

type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; color: string; r: number };
const FW_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#FF9500", "#C7EA46", "#FF69B4", "#A78BFA"];

function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width = canvas.offsetWidth || 460;
    const H = canvas.height = canvas.offsetHeight || 720;
    const ctx = canvas.getContext("2d")!;
    const particles: Particle[] = [];

    function burst(x: number, y: number) {
      const count = 28;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2.5 + Math.random() * 4;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
          alpha: 1, color: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)], r: 2 + Math.random() * 3 });
      }
    }

    let raf: number;
    let elapsed = 0;
    let lastBurst = -999;
    let last = performance.now();

    function tick(now: number) {
      const dt = now - last; last = now; elapsed += dt;
      if (elapsed - lastBurst > 450 && elapsed < 3200) { burst(W * (0.2 + Math.random() * 0.6), H * (0.1 + Math.random() * 0.45)); lastBurst = elapsed; }
      ctx.clearRect(0, 0, W, H);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.alpha -= 0.014;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (elapsed < 4500 || particles.length > 0) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" data-id="fireworks-canvas" />;
}

// ─── Skulls (CSS floating emoji) ─────────────────────────────────────────────

const SKULL_CFG = [
  { x: 8,  delay: 0,   dur: 2200, size: 36 },
  { x: 22, delay: 350, dur: 1900, size: 28 },
  { x: 38, delay: 100, dur: 2400, size: 44 },
  { x: 52, delay: 550, dur: 2000, size: 32 },
  { x: 65, delay: 200, dur: 2100, size: 40 },
  { x: 78, delay: 420, dur: 1800, size: 28 },
  { x: 88, delay: 80,  dur: 2300, size: 36 },
];

function Skulls() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-id="skulls">
      <style>{`@keyframes skull-rise{0%{transform:translateY(0) scale(1);opacity:.9}100%{transform:translateY(-260px) scale(.4);opacity:0}}`}</style>
      {SKULL_CFG.map((s, i) => (
        <span key={i} style={{ position: "absolute", left: `${s.x}%`, bottom: "8%", fontSize: s.size,
          animation: `skull-rise ${s.dur}ms ${s.delay}ms ease-out infinite` }}>💀</span>
      ))}
    </div>
  );
}

// ─── Score cell ───────────────────────────────────────────────────────────────

function ScoreCell({ team, cardPoints, gained, total }: { team: "A" | "B"; cardPoints: number; gained: number; total: number }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg bg-[rgba(255,250,242,0.12)] py-3 px-2" data-id={`deal-score-${team}`}>
      <p className="text-xs text-[var(--card-face)]/65">{t("team")} {team}</p>
      <p className="mt-1 text-xs text-[var(--card-face)]/55">{t("cardPoints")} : <span className="font-bold text-white">{cardPoints}</span></p>
      <p className="text-lg font-bold">+{gained}</p>
      <p className="text-xs text-[var(--card-face)]/65">{t("total")} {total}</p>
    </div>
  );
}
