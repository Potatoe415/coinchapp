"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/client/i18n";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const isInStartedGame = pathname === "/local/play" || pathname.startsWith("/game/");

  if (isInStartedGame) return null;

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
