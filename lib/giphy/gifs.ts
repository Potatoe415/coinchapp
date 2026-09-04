export type GifHit = {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
};

const GIPHY_HOST = /^(media\d*\.giphy\.com|i\.giphy\.com)$/i;

export function isGiphyMediaUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && GIPHY_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export function mapGiphyItems(items: unknown): GifHit[] {
  if (!Array.isArray(items)) return [];
  const hits: GifHit[] = [];
  for (const item of items) {
    const hit = mapGiphyItem(item);
    if (hit) hits.push(hit);
  }
  return hits;
}

function mapGiphyItem(item: unknown): GifHit | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0 || rec.id.length > 64) return null;
  if (!rec.images || typeof rec.images !== "object") return null;
  const images = rec.images as Record<string, unknown>;
  const previewUrl = pickImageUrl(images.fixed_height_small) ?? pickImageUrl(images.fixed_height);
  const url = pickImageUrl(images.fixed_height) ?? pickImageUrl(images.fixed_height_small);
  if (!previewUrl || !url) return null;
  const title = typeof rec.title === "string" ? rec.title.slice(0, 120) : "";
  return { id: rec.id, title, previewUrl, url };
}

function pickImageUrl(image: unknown): string | null {
  if (!image || typeof image !== "object") return null;
  const rec = image as Record<string, unknown>;
  for (const key of ["webp", "url"] as const) {
    const val = rec[key];
    if (typeof val === "string" && isGiphyMediaUrl(val)) return val;
  }
  return null;
}
