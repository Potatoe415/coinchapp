"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { searchGifs } from "@/lib/server/actions-giphy";
import type { GifHit } from "@/lib/giphy/gifs";

export function GifPicker({ onSelect }: { onSelect: (gifUrl: string) => void }) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const { gifs, loading, error } = useGifSearch(query, locale);

  return (
    <div className="flex flex-col gap-2" data-id="gif-picker">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchGifs")}
        autoFocus
        className="w-full rounded-lg bg-white/15 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 outline-none"
        data-id="gif-search-input"
      />
      <GifGrid gifs={gifs} loading={loading} error={error} onSelect={onSelect} />
      <a
        href="https://giphy.com"
        target="_blank"
        rel="noopener noreferrer"
        className="self-end text-[10px] font-bold uppercase tracking-wide text-white/50"
        data-id="giphy-attribution"
      >
        {t("poweredByGiphy")}
      </a>
    </div>
  );
}

function useGifSearch(query: string, locale: "fr" | "en") {
  const [gifs, setGifs] = useState<GifHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const myId = ++reqId.current;
    const delay = query.trim() ? 300 : 0;
    const timer = setTimeout(() => {
      void runSearch(query, locale, myId, reqId, setGifs, setLoading, setError);
    }, delay);
    return () => clearTimeout(timer);
  }, [query, locale]);

  return { gifs, loading, error };
}

async function runSearch(
  query: string,
  locale: "fr" | "en",
  myId: number,
  reqId: { current: number },
  setGifs: (gifs: GifHit[]) => void,
  setLoading: (v: boolean) => void,
  setError: (v: boolean) => void,
) {
  setLoading(true);
  setError(false);
  try {
    const hits = await searchGifs(query, locale);
    if (myId !== reqId.current) return;
    setGifs(hits);
  } catch {
    if (myId !== reqId.current) return;
    setGifs([]);
    setError(true);
  } finally {
    if (myId === reqId.current) setLoading(false);
  }
}

function GifGrid({
  gifs,
  loading,
  error,
  onSelect,
}: {
  gifs: GifHit[];
  loading: boolean;
  error: boolean;
  onSelect: (gifUrl: string) => void;
}) {
  const { t } = useI18n();
  if (error) {
    return <p className="py-4 text-center text-xs text-white/70" data-id="gif-search-error">{t("gifSearchError")}</p>;
  }
  if (loading && gifs.length === 0) {
    return <p className="py-4 text-center text-xs text-white/70" data-id="gif-search-loading">{t("gifSearchLoading")}</p>;
  }
  if (!loading && gifs.length === 0) {
    return <p className="py-4 text-center text-xs text-white/70" data-id="gif-search-empty">{t("gifSearchEmpty")}</p>;
  }
  return (
    <div className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain" data-id="gif-search-grid">
      {gifs.map((gif) => (
        <button
          key={gif.id}
          type="button"
          onClick={() => onSelect(gif.url)}
          aria-label={gif.title || t("sendGif")}
          className="overflow-hidden rounded-md bg-white/10"
          data-id={`gif-pick-${gif.id}`}
        >
          {/* Giphy CDN animated assets; next/image cannot optimize them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gif.previewUrl} alt="" className="h-20 w-full object-cover" />
        </button>
      ))}
    </div>
  );
}
