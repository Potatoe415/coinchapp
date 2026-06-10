import type { Team } from "@/lib/coinche";

export interface PlayerBadgeProps {
  name: string;
  team: Team;
  isTurn: boolean;
  isDealer: boolean;
  isThinking?: boolean;
  dataId?: string;
  orientation?: "horizontal" | "vertical";
}

export function PlayerBadge({
  name,
  team,
  isTurn,
  isDealer,
  isThinking = false,
  dataId,
  orientation = "horizontal",
}: PlayerBadgeProps) {
  const teamClass = team === "A" ? "text-team-a" : "text-team-b";
  const turnClass = isTurn ? "underline decoration-2 underline-offset-2" : "";

  if (orientation === "vertical") {
    return (
      <div data-id={dataId} className="flex items-center gap-1 drop-shadow-lg">
        {isThinking && <ThinkingIndicator />}
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
    <div data-id={dataId} className="flex items-center gap-1 drop-shadow-lg">
      {isThinking && <ThinkingIndicator />}
      <div className={`px-1 py-0.5 text-xl font-black uppercase leading-none ${teamClass} ${turnClass}`}>
        {name}
        {isDealer && <span className="ml-1 align-middle text-[10px]">D</span>}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]"
      viewBox="0 0 24 24"
      fill="none"
      data-id="bot-thinking-indicator"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" strokeOpacity="0.25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
