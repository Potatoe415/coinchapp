import { isGiphyMediaUrl } from "@/lib/giphy/gifs";

export const EMOJI_REACTION_TTL_MS = 3000;
export const GIF_REACTION_TTL_MS = 5000;

export type TableReaction =
  | { id: number; kind: "emoji"; emoji: string }
  | { id: number; kind: "gif"; gifUrl: string };

export type ReactionPick =
  | { kind: "emoji"; emoji: string }
  | { kind: "gif"; gifUrl: string };

export function parseReactionPayload(
  payload: unknown,
): { seat: number; pick: ReactionPick } | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as Record<string, unknown>;
  if (!Number.isInteger(rec.seat) || (rec.seat as number) < 0 || (rec.seat as number) > 3) {
    return null;
  }
  const seat = rec.seat as number;
  const gif = parseGifPick(rec);
  if (gif) return { seat, pick: gif };
  const emoji = parseEmojiPick(rec);
  if (emoji) return { seat, pick: emoji };
  return null;
}

function parseGifPick(rec: Record<string, unknown>): ReactionPick | null {
  if (rec.kind !== "gif") return null;
  if (typeof rec.gifUrl !== "string" || !isGiphyMediaUrl(rec.gifUrl)) return null;
  return { kind: "gif", gifUrl: rec.gifUrl };
}

function parseEmojiPick(rec: Record<string, unknown>): ReactionPick | null {
  if (typeof rec.emoji !== "string") return null;
  const emoji = rec.emoji.trim();
  if (emoji.length < 1 || emoji.length > 32) return null;
  return { kind: "emoji", emoji };
}
