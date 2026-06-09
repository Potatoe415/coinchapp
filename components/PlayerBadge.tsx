import type { Team } from "@/lib/coinche";

export interface PlayerBadgeProps {
  name: string;
  team: Team;
  cardCount: number;
  isTurn: boolean;
  isDealer: boolean;
  dataId?: string;
}

export function PlayerBadge({ name, team, cardCount, isTurn, isDealer, dataId }: PlayerBadgeProps) {
  return (
    <div
      data-id={dataId}
      className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 ring-2 transition-colors ${
        isTurn ? "bg-amber-300/20 ring-amber-300" : "bg-black/30 ring-white/5"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: `var(--team-${team === "A" ? "a" : "b"})` }}
        />
        <span className="text-sm font-bold">{name}</span>
        {isDealer && <span className="text-[10px] text-emerald-200/70">D</span>}
      </div>
      <span className="text-[11px] text-emerald-100/60">{cardCount} cartes</span>
    </div>
  );
}
