"use client";

import { useState } from "react";
import { useI18n } from "@/lib/client/i18n";

const BERGAMOTS_HUB_URL = "https://bergamots.vercel.app/";

/** Back-to-hub + settings (language) controls shown on the home splash screens
 *  (`/` and `/bouilla`). Both sit at z-20: their sibling content (`splash-actions`,
 *  `home-footer-actions`) is `relative z-10` in the same stacking context, so
 *  without a higher z-index its empty padding/margin area intercepts clicks on
 *  these buttons even though nothing is visibly drawn there. */
export function HomeTopBar() {
  const { locale, setLocale, t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <a
        href={BERGAMOTS_HUB_URL}
        className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm"
        data-id="home-back"
        aria-label={t("backToHub")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </a>

      <button
        type="button"
        onClick={() => setSettingsOpen((open) => !open)}
        className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm"
        data-id="home-settings-button"
        aria-label={t("settings")}
        aria-expanded={settingsOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {settingsOpen && (
        <div
          className="absolute right-4 top-16 z-20 w-40 rounded-2xl bg-[var(--surface-overlay)] p-2 shadow-lg ring-1 ring-[var(--accent-cyan)]/25"
          data-id="home-settings-panel"
        >
          <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-[var(--card-face)]/60">
            {t("language")}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              data-id="home-settings-lang-fr"
              onClick={() => setLocale("fr")}
              aria-pressed={locale === "fr"}
              className={`flex-1 rounded-xl px-2 py-1.5 text-sm font-bold ${
                locale === "fr" ? "bg-[var(--accent-yellow)] text-[var(--surface)]" : "bg-black/10 text-[var(--card-face)]/70"
              }`}
            >
              FR
            </button>
            <button
              type="button"
              data-id="home-settings-lang-en"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`flex-1 rounded-xl px-2 py-1.5 text-sm font-bold ${
                locale === "en" ? "bg-[var(--accent-yellow)] text-[var(--surface)]" : "bg-black/10 text-[var(--card-face)]/70"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      )}
    </>
  );
}
