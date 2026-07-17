import type { Round } from "@/lib/bouilla";
import type { Locale } from "@/lib/client/i18n";

export const ROUND_LABEL: Record<Locale, Record<Round, string>> = {
  fr: {
    tricks: "Pas de plis",
    clubs: "Pas de trèfles",
    queens: "Pas de dames",
    kingSpades: "Pas de roi de pique",
    lastTrick: "Pas de dernier pli",
    everything: "La Bouilla",
  },
  en: {
    tricks: "No tricks",
    clubs: "No clubs",
    queens: "No queens",
    kingSpades: "No king of spades",
    lastTrick: "No last trick",
    everything: "Everything",
  },
};

export const ROUND_PENALTY_LABEL: Record<Locale, Record<Round, string>> = {
  fr: {
    tricks: "5 pts / pli",
    clubs: "10 pts / trèfle",
    queens: "20 pts / dame",
    kingSpades: "50 pts",
    lastTrick: "100 pts",
    everything: "Cumul des 5 règles",
  },
  en: {
    tricks: "5 pts / trick",
    clubs: "10 pts / club",
    queens: "20 pts / queen",
    kingSpades: "50 pts",
    lastTrick: "100 pts",
    everything: "All 5 rules combined",
  },
};
