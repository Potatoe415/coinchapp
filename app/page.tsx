"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/client/i18n";

const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"];

export default function Home() {
  const router = useRouter();
  const { locale, t } = useI18n();

  return (
    <main
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between px-6 py-12"
      data-id="home-screen"
    >
      <div className="flex flex-1 flex-col items-center justify-start gap-6 pt-8 text-center">
        <div className="flex gap-4 text-4xl" data-id="splash-suits" aria-hidden="true">
          {SUIT_SYMBOLS.map((s) => (
            <span
              key={s}
              className={s === "♥" || s === "♦" ? "text-[var(--accent-red)]" : "text-[var(--card-ink)]"}
            >
              {s}
            </span>
          ))}
        </div>

        <div data-id="splash-title">
          <h1 className="text-6xl font-black tracking-tight text-[var(--surface)]">Coinche</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            {locale === "fr"
              ? "Jouez en local contre des bots, ou à 4 en ligne."
              : "Play local against bots, or online with 4 players."}
          </p>
        </div>

        <div className="mt-6 flex w-full flex-col gap-3" data-id="splash-actions">
          <button
            data-id="play-local-button"
            onClick={() => router.push("/local")}
            className="rounded-2xl bg-[var(--accent-yellow)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
          >
            {t("playLocal")}
            <span className="mt-0.5 block text-xs font-medium text-[var(--surface)]/80">
              {t("localOfflineNote")}
            </span>
          </button>

          <button
            data-id="play-online-button"
            onClick={() => router.push("/online?target=1000&difficulty=medium")}
            className="rounded-2xl bg-[var(--accent-cyan)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
          >
            {t("playOnline")}
          </button>
        </div>
      </div>
    </main>
  );
}
