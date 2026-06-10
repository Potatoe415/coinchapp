"use client";

import { useI18n } from "@/lib/client/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <label
      className="fixed right-3 top-3 z-[60] flex items-center gap-2 rounded-full bg-[var(--surface-overlay)] px-3 py-1 text-xs font-bold text-[var(--card-face)] ring-1 ring-[var(--accent-cyan)]/30"
      data-id="language-switcher"
    >
      <select
        data-id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value === "en" ? "en" : "fr")}
        aria-label="Language"
        className="rounded bg-transparent text-[var(--card-face)] outline-none"
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
