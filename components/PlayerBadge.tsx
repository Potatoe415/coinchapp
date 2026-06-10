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
  const teamClass = team === "A" ? "text-team-a" : "text-team-b";
  const turnClass = isTurn ? "underline decoration-2 underline-offset-2" : "";

  if (orientation === "vertical") {
    return (
      <div data-id={dataId} className="flex items-center drop-shadow-lg">
        <div
          className={`px-1 py-2 text-lg font-black uppercase leading-none ${teamClass} ${turnClass}`}
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
      <div className={`px-1 py-0.5 text-xl font-black uppercase leading-none ${teamClass} ${turnClass}`}>
        {name}
        {isDealer && <span className="ml-1 align-middle text-[10px]">D</span>}
      </div>
    </div>
  );
}
