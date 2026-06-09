import type { Team } from "@/lib/coinche";

export interface PlayerBadgeProps {
  name: string;
  team: Team;
  isTurn: boolean;
  isDealer: boolean;
  dataId?: string;
  orientation?: "horizontal" | "vertical";
}

export function PlayerBadge({
  name,
  team,
  isTurn,
  isDealer,
  dataId,
  orientation = "horizontal",
}: PlayerBadgeProps) {
  const teamClass = team === "A" ? "bg-team-a" : "bg-team-b";
  const turnClass = isTurn ? "ring-4 ring-amber-300" : "ring-2 ring-black/15";

  if (orientation === "vertical") {
    return (
      <div data-id={dataId} className="flex items-center drop-shadow-lg">
        <div
          className={`rounded-full px-1.5 py-3 text-lg font-black uppercase leading-none ${teamClass} ${turnClass}`}
          style={{ writingMode: "vertical-rl" }}
        >
          {name}
          {isDealer && <span className="mt-1 text-[10px]">D</span>}
        </div>
      </div>
    );
  }

  return (
    <div data-id={dataId} className="flex flex-col items-center gap-0.5 drop-shadow-lg">
      <div className={`rounded-full px-3 py-1 text-xl font-black uppercase leading-none ${teamClass} ${turnClass}`}>
        {name}
        {isDealer && <span className="ml-1 align-middle text-[10px]">D</span>}
      </div>
    </div>
  );
}
