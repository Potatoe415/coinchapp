"use client";

import { useI18n } from "@/lib/client/i18n";
import type { GameType } from "@/lib/supabase/types";

interface Props {
  onClose: () => void;
  game?: GameType;
}

const BOUILLA_RULES = {
  fr: {
    title: "Règles de la Bouilla",
    sections: [
      {
        heading: "But du jeu",
        body: "4 joueurs, chacun pour soi. Paquet de 52 cartes (13 par joueur), pas d'atout. 6 manches à règle fixe, jouées une seule fois chacune. À la fin, le moins de points gagne (comme au golf).",
      },
      {
        heading: "Les 6 manches",
        body: "1. Éviter les plis — 5 pts par pli pris.\n2. Éviter les trèfles — 10 pts par trèfle pris.\n3. Éviter les dames — 20 pts par dame prise.\n4. Éviter le roi de pique — 50 pts s'il est pris.\n5. Éviter le dernier pli — 100 pts.\n6. La Bouilla : toutes les règles ci-dessus cumulées sur les mêmes plis.",
      },
      {
        heading: "Le jeu des plis",
        body: "Fournissez la couleur demandée si vous le pouvez, sinon défaussez librement (pas d'atout, donc pas d'obligation de couper). Le pli est remporté par la plus haute carte de la couleur demandée.",
      },
      {
        heading: "Le score",
        body: "Les pénalités de chaque manche s'additionnent au score total de chaque joueur. Après les 6 manches, le ou les joueurs avec le moins de points remportent la partie.",
      },
    ],
  },
  en: {
    title: "la Bouilla Rules",
    sections: [
      {
        heading: "Goal",
        body: "4 players, every player for themselves. Full 52-card pack (13 each), no trump. 6 fixed rounds, each played once. Lowest total score wins (like golf).",
      },
      {
        heading: "The 6 rounds",
        body: "1. Avoid tricks — 5 pts per trick won.\n2. Avoid clubs — 10 pts per club won.\n3. Avoid queens — 20 pts per queen won.\n4. Avoid the king of spades — 50 pts if won.\n5. Avoid the last trick — 100 pts.\n6. Everything at once: every rule above stacked on the same tricks.",
      },
      {
        heading: "Playing tricks",
        body: "Follow the led suit if you can, otherwise discard freely (no trump, so no obligation to cut). The trick goes to the highest card of the led suit.",
      },
      {
        heading: "Scoring",
        body: "Each round's penalties add to every player's running total. After all 6 rounds, whoever has the lowest total wins.",
      },
    ],
  },
} as const;

const PRESIDENT_RULES = {
  fr: {
    title: "Règles du Président (Trou du cul)",
    sections: [
      {
        heading: "But du jeu",
        body: "4 joueurs, chacun pour soi. Paquet de 52 cartes (13 par joueur), pas d'atout. Le but est de se débarrasser de toutes ses cartes le plus vite possible, manche après manche.",
      },
      {
        heading: "Ordre des cartes",
        body: "Du plus faible au plus fort : 3, 4, 5, 6, 7, 8, 9, 10, Valet, Dame, Roi, As, 2 (le 2 est la carte la plus forte).",
      },
      {
        heading: "Jouer",
        body: "À son tour, on joue une carte seule, une paire, un brelan ou un carré (des cartes de même hauteur), plus fort que ce qui est posé, avec le même nombre de cartes — ou on passe. Une fois que tout le monde a passé, la pile est ramassée et celui qui a posé en dernier rejoue librement.",
      },
      {
        heading: "Le doublé",
        body: "Au lieu de monter, on peut aussi rejouer la même hauteur que la pile (même nombre de cartes) : ça saute le tour du joueur suivant. Si ça complète les 4 cartes de cette hauteur, la pile est brûlée d'un coup et on rejoue librement.",
      },
      {
        heading: "La révolution",
        body: "Poser un carré (4 cartes identiques) inverse l'ordre des cartes jusqu'à la prochaine révolution ou la fin de la manche : le 3 devient alors la carte la plus forte, et le 2 la plus faible.",
      },
      {
        heading: "Les titres",
        body: "Le premier à se débarrasser de toutes ses cartes devient Président, le 2e Vice-Président, le 3e Vice-Trou du cul, le dernier Trou du cul.",
      },
      {
        heading: "L'échange",
        body: "Au début de chaque manche suivante, le Trou du cul donne ses 2 meilleures cartes au Président (qui rend 2 cartes de son choix), et le Vice-Trou du cul donne sa meilleure carte au Vice-Président (qui rend 1 carte).",
      },
      {
        heading: "Le score",
        body: "Chaque manche, la place de chacun (1 pour Président, 4 pour Trou du cul) s'ajoute à son total. Après le nombre de manches prévu, le total le plus bas gagne.",
      },
    ],
  },
  en: {
    title: "President (Asshole) Rules",
    sections: [
      {
        heading: "Goal",
        body: "4 players, every player for themselves. Full 52-card pack (13 each), no trump. The goal is to get rid of every card as fast as possible, round after round.",
      },
      {
        heading: "Card order",
        body: "Weakest to strongest: 3, 4, 5, 6, 7, 8, 9, 10, Jack, Queen, King, Ace, 2 (2 is the strongest card).",
      },
      {
        heading: "Playing",
        body: "On your turn, play a single card, a pair, a triple or a quad (same rank), stronger than what's down, with the same card count — or pass. Once everyone has passed, the pile clears and whoever played last leads freely again.",
      },
      {
        heading: "The double",
        body: "Instead of beating the pile, you can also replay its exact rank (same card count): this skips the next player's turn entirely. If it completes all 4 cards of that rank, the pile burns instantly instead and you lead freely again.",
      },
      {
        heading: "Revolution",
        body: "Playing a quad (4 identical cards) reverses the card order until the next revolution or the end of the round: 3 becomes the strongest card, 2 the weakest.",
      },
      {
        heading: "Titles",
        body: "The first to get rid of every card becomes President, the 2nd Vice-President, the 3rd Vice-Asshole, the last one Asshole.",
      },
      {
        heading: "The exchange",
        body: "At the start of every following round, the Asshole gives their 2 best cards to the President (who gives back any 2 cards), and the Vice-Asshole gives their best card to the Vice-President (who gives back 1 card).",
      },
      {
        heading: "Scoring",
        body: "Each round, everyone's finishing rank (1 for President, 4 for Asshole) is added to their total. After the planned number of rounds, the lowest total wins.",
      },
    ],
  },
} as const;

const COINCHE_RULES = {
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

export function RulesModal({ onClose, game = "coinche" }: Props) {
  const { locale } = useI18n();
  const rulesByGame = { coinche: COINCHE_RULES, bouilla: BOUILLA_RULES, president: PRESIDENT_RULES };
  const rules = rulesByGame[game][locale];

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
