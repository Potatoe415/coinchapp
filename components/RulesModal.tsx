"use client";

import { useI18n } from "@/lib/client/i18n";

interface Props {
  onClose: () => void;
}

const RULES = {
  fr: {
    title: "Règles de la Coinche",
    sections: [
      {
        heading: "But du jeu",
        body: "Être la première équipe à atteindre le score objectif en remportant des plis.",
      },
      {
        heading: "Les équipes",
        body: "4 joueurs en 2 équipes de 2 : Nord/Sud contre Est/Ouest. Les partenaires sont assis face à face.",
      },
      {
        heading: "Ordre des cartes",
        body: "À l'atout : Valet (20 pts) › 9 (14 pts) › As (11 pts) › 10 (10 pts) › Roi (4 pts) › Dame (3 pts) › 8 › 7.\nAutres couleurs : As (11 pts) › 10 (10 pts) › Roi (4 pts) › Dame (3 pts) › Valet (2 pts) › 9 › 8 › 7.",
      },
      {
        heading: "Les enchères",
        body: "Chaque joueur annonce une valeur (80, 90, 100…) avec une couleur d'atout, ou passe. Les enchères montent jusqu'à Capot (tous les plis) ou Générale (tous les plis seul). Un adversaire peut Coincher pour doubler les enjeux.",
      },
      {
        heading: "Le jeu des plis",
        body: "Fournissez la couleur demandée. Si impossible, jouez atout en montant si votre partenaire n'est pas maître. Le pli est remporté par la plus haute carte de la couleur demandée, ou la plus haute carte d'atout.",
      },
      {
        heading: "Le comptage",
        body: "160 pts dans les plis + 10 de der (dernier pli) = 170 pts total. L'équipe preneuse doit atteindre sa valeur d'annonce. Sinon elle « chute » : l'adversaire marque 160 + la valeur du contrat.",
      },
    ],
  },
  en: {
    title: "Coinche Rules",
    sections: [
      {
        heading: "Goal",
        body: "Be the first team to reach the target score by winning tricks.",
      },
      {
        heading: "Teams",
        body: "4 players in 2 teams of 2: North/South vs East/West. Partners sit across from each other.",
      },
      {
        heading: "Card order",
        body: "Trump suit: Jack (20 pts) › 9 (14 pts) › Ace (11 pts) › 10 (10 pts) › King (4 pts) › Queen (3 pts) › 8 › 7.\nOther suits: Ace (11 pts) › 10 (10 pts) › King (4 pts) › Queen (3 pts) › Jack (2 pts) › 9 › 8 › 7.",
      },
      {
        heading: "Bidding",
        body: "Each player bids a value (80, 90, 100…) with a trump suit, or passes. Bids escalate up to Capot (all tricks) or Générale (all tricks solo). An opponent can Coinche to double the stakes.",
      },
      {
        heading: "Playing tricks",
        body: "Follow the led suit. If you can't, play trump and beat if your partner isn't winning. The trick goes to the highest card of the led suit, or the highest trump played.",
      },
      {
        heading: "Scoring",
        body: "160 trick points + 10 for the last trick = 170 total. The bidding team must reach their announced value or they go down: the defense scores 160 + the contract value.",
      },
    ],
  },
} as const;

export function RulesModal({ onClose }: Props) {
  const { locale } = useI18n();
  const rules = RULES[locale];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4"
      data-id="rules-modal-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-xl"
        data-id="rules-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-black text-[var(--card-face)]"
            data-id="rules-modal-title"
          >
            {rules.title}
          </h2>
          <button
            data-id="rules-modal-close"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-[var(--card-face)]/60 hover:text-[var(--card-face)]"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {rules.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-sm font-bold text-[var(--accent-cyan)]">
                {section.heading}
              </h3>
              <p className="whitespace-pre-line text-sm text-[var(--card-face)]/80">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
