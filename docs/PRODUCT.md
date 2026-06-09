# PRODUCT

Status: Living document. Never edit autonomously - confirm with user first.

---

Project_Name: Coinche en ligne
Objective: Permettre de jouer une partie de Coinche à 4 dans un navigateur mobile, en ligne avec d'autres joueurs ou contre des bots.
Problem: Les jeux de Coinche existants sont souvent des apps natives ou peu adaptés au jeu rapide entre amis via un simple lien.

Target_Users:
- Joueurs de Coinche occasionnels sur mobile.
- Groupes d'amis qui veulent lancer une partie rapidement via un code de salon.

Core_Features:
- Création/rejoindre une partie via un code de salon (sans compte, pseudo anonyme).
- Sièges vides remplis par des bots (jouable même seul).
- Partie complète : enchères (annonce, coinche, surcoinche), jeu des plis, scoring.
- Règles de Coinche : 32 cartes, ordres/points atout vs non-atout, dix de der, belote, capot.
- Paramètres de partie : objectif de points, difficulté des bots.
- Synchronisation temps réel entre joueurs.

Out_Of_Scope:
- Comptes utilisateurs, statistiques persistantes, classement (pour l'instant).
- Spectateurs, chat, variantes régionales avancées.
- Annonce manuelle Belote/Rebelote (auto-détectée pour l'instant).

User_Roles:
- Joueur (membre d'une partie, occupe un siège).
- Bot (siège contrôlé par l'IA serveur).

Success_Criteria:
- Une partie peut être jouée de bout en bout (création -> enchères -> 8 plis -> score -> manche suivante -> fin).
- Les mains des adversaires ne sont jamais visibles côté client.
- Les coups illégaux sont rejetés par le serveur.

Constraints:
- Mobile-first, navigateur uniquement.
- Déploiement Git + Vercel, données sur Supabase.

Open_Questions:
- Faut-il l'annonce manuelle Belote/Rebelote et les variantes de règles ?
- Faut-il des comptes pour les statistiques à terme ?
