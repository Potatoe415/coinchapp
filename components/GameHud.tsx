import Link from "next/link";
import type { ReactNode } from "react";
import type { PlayerView } from "@/lib/coinche";
import { formatContract } from "./labels";

export function GameHud({ view }: { view: PlayerView }) {
  return (
    <header className="absolute inset-x-0 top-4 z-30 px-3" data-id="game-header">
      <div className="flex items-start justify-between">
        <IconLink href="/" label="Retour" dataId="game-back">
          ‹
        </IconLink>
        <div className="flex flex-col items-center">
          <div className="flex min-w-52 items-center justify-between rounded-lg bg-black/70 px-4 py-1 shadow-lg">
            <ScoreNumber color="var(--team-a)" value={view.scores.A} />
            <div className="text-center leading-none">
              <p className="text-[8px] font-black uppercase">Objectif</p>
              <p className="text-xl font-black" data-id="game-target">
                {view.targetPoints}
              </p>
            </div>
            <ScoreNumber color="var(--team-b)" value={view.scores.B} />
          </div>
          <p className="mt-2 rounded-full bg-black/45 px-4 py-1 text-base font-black" data-id="game-contract">
            {view.trump ? formatContract(view.contract) : "Enchères"}
          </p>
        </div>
        <StatsButton />
      </div>
    </header>
  );
}

function IconLink({
  href,
  label,
  dataId,
  children,
}: {
  href: string;
  label: string;
  dataId: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-5xl font-black leading-none text-team-a shadow-lg"
      data-id={dataId}
    >
      {children}
    </Link>
  );
}

function StatsButton() {
  return (
    <button
      type="button"
      data-id="game-stats-button"
      className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-team-a shadow-lg"
      aria-label="Statistiques"
    >
      <span className="flex items-end gap-1">
        <span className="h-5 w-2 rounded-full bg-team-a/70" />
        <span className="h-9 w-2 rounded-full bg-team-a" />
        <span className="h-7 w-2 rounded-full bg-team-a/80" />
      </span>
    </button>
  );
}

function ScoreNumber({ color, value }: { color: string; value: number }) {
  return (
    <span className="min-w-10 text-center text-3xl font-black leading-none" style={{ color }}>
      {value}
    </span>
  );
}
