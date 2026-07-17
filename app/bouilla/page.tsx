"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RulesModal } from "@/components/RulesModal";
import { useI18n } from "@/lib/client/i18n";

/** Same layout/mode picker as the home screen, but every button reuses the existing
 *  /local, /online, /adhoc routes with `?game=bouilla` instead of a duplicated tree. */
export default function BouillaPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [showRules, setShowRules] = useState(false);

  return (
    <main
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between overflow-hidden"
      data-id="bouilla-home-screen"
      style={{
        backgroundImage: "url('/splashscreen.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
        data-id="bouilla-home-back"
        aria-label={t("backHome")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </Link>

      <div className="relative z-10 flex w-full flex-col items-center gap-3 px-6 pt-[25vh]" data-id="bouilla-splash-actions">
        <h1 className="mb-2 text-center text-2xl font-black text-white drop-shadow" data-id="bouilla-home-title">
          la Bouilla
        </h1>

        <button
          data-id="bouilla-play-local-button"
          onClick={() => router.push("/local?game=bouilla")}
          className="w-full rounded-2xl bg-[var(--accent-yellow)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
        >
          {t("playLocal")}
          <span className="mt-0.5 block text-xs font-medium text-[var(--surface)]/80">{t("localOfflineNote")}</span>
        </button>

        <button
          data-id="bouilla-play-online-button"
          onClick={() => router.push("/online?game=bouilla")}
          className="w-full rounded-2xl bg-[var(--accent-cyan)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
        >
          {t("playOnline")}
        </button>

        <button
          data-id="bouilla-play-adhoc-button"
          onClick={() => router.push("/adhoc?game=bouilla")}
          className="w-full rounded-2xl bg-[var(--accent-green)] px-4 py-5 text-lg font-black text-[var(--surface)] shadow-lg"
        >
          {t("playAdhoc")}
          <span className="mt-0.5 block text-xs font-medium text-[var(--surface)]/80">{t("adhocOfflineNote")}</span>
        </button>
      </div>

      <div className="relative z-10 mb-4 flex items-center gap-3 self-center">
        <button
          data-id="bouilla-rules-button"
          onClick={() => setShowRules(true)}
          className="rounded-lg border border-white/40 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/60 hover:text-white/90 active:scale-95"
        >
          {t("rulesButton")}
        </button>
      </div>

      {showRules && <RulesModal game="bouilla" onClose={() => setShowRules(false)} />}
    </main>
  );
}
