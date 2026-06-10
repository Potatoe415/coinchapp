"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Difficulty } from "@/lib/coinche";

export type Locale = "fr" | "en";

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey) => string;
};

const STORAGE_KEY = "coinchapp-locale";

const TRANSLATIONS = {
  fr: {
    backToDashboard: "Retour au dashboard",
    backHome: "Retour à l'accueil",
    back: "Retour",
    loading: "Chargement…",
    gameNotFound: "Partie introuvable",
    gameInProgressSpectator: "Cette partie est en cours et vous n’y participez pas.",
    playLocal: "Jouer en local",
    localSubtitle: "Préparez votre partie contre 3 bots.",
    localOfflineNote: "Hors-ligne, contre 3 bots",
    playOnline: "Jouer en ligne",
    onlineSubtitle: "Créez une partie ou rejoignez une room existante.",
    settings: "Paramètres",
    gameSettings: "Paramètres de partie",
    pointsCount: "Nombre de points",
    bots: "Bots",
    start: "Démarrer",
    yourName: "Votre pseudo",
    pseudo: "Pseudo",
    createOnlineGame: "Créer partie en ligne",
    join: "Rejoindre",
    close: "Fermer",
    unknownError: "Erreur inconnue",
    error: "Erreur",
    fillBots: "Remplir avec des bots",
    startGame: "Démarrer la partie",
    waitingFourPlayers: "En attente de 4 joueurs",
    gameCode: "Code de la partie",
    copyInviteLink: "Copier le lien d'invitation",
    linkCopied: "Lien copié !",
    inviteLink: "Lien d'invitation",
    target: "Objectif",
    seat: "Siège",
    team: "équipe",
    free: "Libre",
    bot: "bot",
    you: "vous",
    bidding: "Enchères",
    biddingInProgress: "Enchères en cours…",
    bid: "Annonce",
    capot: "Capot",
    generale: "Generale",
    pass: "Passer",
    coinche: "Coincher",
    surcoinche: "Surcoincher",
    winnerTeam: "Équipe {team} gagne !",
    finalScore: "Score final {a} – {b}",
    newGame: "Nouvelle partie",
    endOfDeal: "Fin de la donne",
    contractByTeam: "Contrat {contract} par l’équipe {team}",
    contractMade: "Contrat réussi",
    contractFailed: "Contrat chuté",
    nextDeal: "Donne suivante",
    total: "total",
    stats: "Statistiques",
    parameters: "Paramètres",
    currentHost: "Hôte actuel",
    becomeHost: "Devenir hôte",
    youAreHost: "Vous êtes l'hôte",
    noContract: "Pas de contrat",
    localOnlyContractPoints: "Compter uniquement les points du contrat quand il est fait",
    failedContract: "Contrat chuté",
    failedCapot: "Capot chuté",
    lastTrick: "Dernier pli",
    failedContractFull: "Adversaire marque 160 + contrat",
    failedContractOnly160: "Adversaire marque 160",
    opponentPoints: "Points de l'équipe adverse",
    countOpponentPoints: "Compter leurs points de plis",
    zeroOpponentPoints: "Ne pas compter leurs points (0)",
    language: "Langue",
    confirmBid: "OK",
    restartGame: "Recommencer",
  },
  en: {
    backToDashboard: "Back to dashboard",
    backHome: "Back to home",
    back: "Back",
    loading: "Loading…",
    gameNotFound: "Game not found",
    gameInProgressSpectator: "This game is in progress and you are not part of it.",
    playLocal: "Play local",
    localSubtitle: "Prepare your game against 3 bots.",
    localOfflineNote: "Offline, against 3 bots",
    playOnline: "Play online",
    onlineSubtitle: "Create a game or join an existing room.",
    settings: "Settings",
    gameSettings: "Game settings",
    pointsCount: "Points target",
    bots: "Bots",
    start: "Start",
    yourName: "Your nickname",
    pseudo: "Nickname",
    createOnlineGame: "Create online game",
    join: "Join",
    close: "Close",
    unknownError: "Unknown error",
    error: "Error",
    fillBots: "Fill with bots",
    startGame: "Start game",
    waitingFourPlayers: "Waiting for 4 players",
    gameCode: "Game code",
    copyInviteLink: "Copy invite link",
    linkCopied: "Link copied!",
    inviteLink: "Invite link",
    target: "Target",
    seat: "Seat",
    team: "team",
    free: "Free",
    bot: "bot",
    you: "you",
    bidding: "Bidding",
    biddingInProgress: "Bidding in progress…",
    bid: "Bid",
    capot: "Capot",
    generale: "General",
    pass: "Pass",
    coinche: "Coinche",
    surcoinche: "Surcoinche",
    winnerTeam: "Team {team} wins!",
    finalScore: "Final score {a} – {b}",
    newGame: "New game",
    endOfDeal: "End of deal",
    contractByTeam: "Contract {contract} by team {team}",
    contractMade: "Contract made",
    contractFailed: "Contract failed",
    nextDeal: "Next deal",
    total: "total",
    stats: "Stats",
    parameters: "Settings",
    currentHost: "Current host",
    becomeHost: "Become host",
    youAreHost: "You are the host",
    noContract: "No contract",
    localOnlyContractPoints: "Count only contract points when made",
    failedContract: "Failed contract",
    failedCapot: "Failed capot",
    lastTrick: "Last trick",
    failedContractFull: "Defense scores 160 + contract",
    failedContractOnly160: "Defense scores 160",
    opponentPoints: "Opponent team points",
    countOpponentPoints: "Count their trick points",
    zeroOpponentPoints: "Do not count their points (0)",
    language: "Language",
    confirmBid: "OK",
    restartGame: "Restart",
  },
} as const;

type TranslationKey = keyof (typeof TRANSLATIONS)["fr"];

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en") setLocale(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => TRANSLATIONS[locale][key],
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function difficultyLabel(level: Difficulty, locale: Locale): string {
  if (level === "easy") return locale === "fr" ? "Facile" : "Easy";
  if (level === "hard") return locale === "fr" ? "Difficile" : "Hard";
  return locale === "fr" ? "Moyen" : "Medium";
}

export function formatText(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
