import type { Round } from "@/lib/bouilla";

export const ROUND_LABEL_FR: Record<Round, string> = {
  tricks: "Pas de plis",
  clubs: "Pas de trèfles",
  queens: "Pas de dames",
  kingSpades: "Pas de roi de pique",
  lastTrick: "Pas de dernier pli",
  everything: "La Bouilla",
};

export const ROUND_PENALTY_LABEL_FR: Record<Round, string> = {
  tricks: "5 pts / pli",
  clubs: "10 pts / trèfle",
  queens: "20 pts / dame",
  kingSpades: "50 pts",
  lastTrick: "100 pts",
  everything: "Cumul des 5 règles",
};
