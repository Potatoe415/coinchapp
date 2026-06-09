import type { Card, Suit } from "@/lib/coinche";

const SUIT_SYMBOL: Record<Suit, string> = { H: "\u2665", D: "\u2666", C: "\u2663", S: "\u2660" };
const RED_SUITS: Suit[] = ["H", "D"];

const SIZES = {
  sm: "h-14 w-10 text-base",
  md: "h-20 w-14 text-xl",
  lg: "h-24 w-16 text-2xl",
} as const;

export interface PlayingCardProps {
  card: Card;
  size?: keyof typeof SIZES;
  dimmed?: boolean;
  playable?: boolean;
  onClick?: () => void;
  dataId?: string;
}

export function PlayingCard({ card, size = "md", dimmed, playable, onClick, dataId }: PlayingCardProps) {
  const red = RED_SUITS.includes(card.suit);
  const interactive = !!onClick;
  const Tag = interactive ? "button" : "div";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      disabled={interactive ? !playable : undefined}
      data-id={dataId}
      data-card={`${card.rank}${card.suit}`}
      className={[
        "relative flex flex-col items-center justify-center rounded-lg border border-black/10 bg-white font-bold shadow-md select-none",
        SIZES[size],
        red ? "text-rose-600" : "text-neutral-900",
        dimmed ? "opacity-40 saturate-50" : "",
        playable ? "ring-2 ring-amber-300 -translate-y-2 cursor-pointer" : "",
        interactive && !playable ? "cursor-not-allowed" : "",
        "transition-transform",
      ].join(" ")}
    >
      <span className="leading-none">{card.rank}</span>
      <span className="leading-none">{SUIT_SYMBOL[card.suit]}</span>
    </Tag>
  );
}

export function CardBack({ size = "md", dataId }: { size?: keyof typeof SIZES; dataId?: string }) {
  return (
    <div
      data-id={dataId}
      className={[
        "rounded-lg border border-black/20 shadow-md",
        "bg-[repeating-linear-gradient(45deg,#1e3a5f,#1e3a5f_6px,#274b78_6px,#274b78_12px)]",
        SIZES[size],
      ].join(" ")}
    />
  );
}
