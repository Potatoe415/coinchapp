import { isGiphyMediaUrl } from "@/lib/giphy/gifs";
import type { TableReaction } from "@/lib/client/reactions";

const EMOJI_CLASS = {
  sm: "text-5xl",
  md: "text-6xl",
  lg: "text-7xl",
  xl: "text-8xl",
} as const;

const GIF_CLASS = {
  sm: "max-h-12 max-w-[4.5rem]",
  md: "max-h-16 max-w-[5.5rem]",
  lg: "max-h-20 max-w-[6.5rem]",
  xl: "max-h-24 max-w-32",
} as const;

export function ReactionBubble({
  reaction,
  size,
  dataId,
}: {
  reaction: TableReaction;
  size: keyof typeof EMOJI_CLASS;
  dataId: string;
}) {
  if (reaction.kind === "gif") {
    if (!isGiphyMediaUrl(reaction.gifUrl)) return null;
    return (
      // Giphy CDN animated assets; next/image cannot optimize them.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={reaction.id}
        src={reaction.gifUrl}
        alt=""
        className={`gif-react ${GIF_CLASS[size]} rounded-md object-contain`}
        data-id={dataId}
      />
    );
  }
  return (
    <span key={reaction.id} className={`emoji-react ${EMOJI_CLASS[size]} leading-none`} data-id={dataId}>
      {reaction.emoji}
    </span>
  );
}
