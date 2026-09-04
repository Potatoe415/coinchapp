"use server";

import { mapGiphyItems } from "@/lib/giphy/gifs";

const SEARCH = "https://api.giphy.com/v1/gifs/search";
const TRENDING = "https://api.giphy.com/v1/gifs/trending";
const LIMIT = 24;
const RATING = "pg-13";

export async function searchGifs(query: string, lang: "fr" | "en" = "fr") {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) throw new Error("giphy_unconfigured");
  const q = query.trim().slice(0, 50);
  const url = buildGiphyUrl(q, lang, apiKey);
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("giphy_failed");
  const body = (await res.json()) as { data?: unknown };
  return mapGiphyItems(body.data);
}

function buildGiphyUrl(q: string, lang: "fr" | "en", apiKey: string): URL {
  const url = new URL(q ? SEARCH : TRENDING);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("rating", RATING);
  url.searchParams.set("lang", lang);
  if (q) url.searchParams.set("q", q);
  return url;
}
