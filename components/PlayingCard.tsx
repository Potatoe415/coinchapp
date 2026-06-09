import type { Card, Suit } from "@/lib/coinche";

const SUIT_SYMBOL: Record<Suit, string> = { H: "\u2665", D: "\u2666", C: "\u2663", S: "\u2660" };
const RED_SUITS: Suit[] = ["H", "D"];

const SIZES = {
  xs: { card: "h-10 w-7", rank: "text-xs", suit: "text-lg" },
  sm: { card: "h-14 w-10", rank: "text-base", suit: "text-2xl" },
  md: { card: "h-20 w-14", rank: "text-xl", suit: "text-4xl" },
  lg: { card: "h-24 w-16", rank: "text-2xl", suit: "text-5xl" },
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
  const sizeStyle = SIZES[size];
  const Tag = interactive ? "button" : "div";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      disabled={interactive ? !playable : undefined}
      data-id={dataId}
      data-card={`${card.rank}${card.suit}`}
      className={[
        "relative overflow-hidden rounded-lg border-2 border-neutral-950 bg-white font-black shadow-[0_2px_0_rgba(0,0,0,0.7)] select-none",
        sizeStyle.card,
        red ? "text-rose-600" : "text-neutral-900",
        dimmed ? "opacity-40 saturate-50" : "",
        playable ? "ring-4 ring-amber-300 cursor-pointer" : "",
        interactive && !playable ? "cursor-not-allowed" : "",
        "transition-transform",
      ].join(" ")}
    >
      <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
        <span className={`font-black leading-none ${sizeStyle.rank}`}>{card.rank}</span>
        <span className="leading-none">{SUIT_SYMBOL[card.suit]}</span>
      </div>
      <span
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[35%] leading-none ${sizeStyle.suit}`}
      >
        {SUIT_SYMBOL[card.suit]}
      </span>
    </Tag>
  );
}

export function CardBack({ size = "md", dataId }: { size?: keyof typeof SIZES; dataId?: string }) {
  const sizeStyle = SIZES[size];
  return (
    <div
      data-id={dataId}
      className={[
        "relative overflow-hidden rounded-lg border-[3px] border-neutral-950 bg-[#102745] shadow-[0_2px_0_rgba(0,0,0,0.75)]",
        sizeStyle.card,
      ].join(" ")}
    >
      <div className="absolute inset-[3px] rounded-md border-2 border-[#37b8e8] bg-[#19365c]" />
      <div className="absolute inset-y-[7px] left-[7px] w-[3px] rounded-full bg-[#74ddff]" />
      <div className="absolute inset-y-[7px] right-[7px] w-[3px] rounded-full bg-[#0b1f39]" />
      <div className="absolute inset-x-[10px] top-[10px] h-[2px] rounded-full bg-[#72d7ff]/80" />
      <div className="absolute inset-x-[10px] top-[15px] h-[2px] rounded-full bg-[#72d7ff]/50" />
    </div>
  );
}
