# Coinche en ligne

Jeu de Coinche (belote contrée à 4) jouable dans le navigateur, mobile-first.
Parties en ligne via un code de salon, sièges vides remplis par des bots.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (Postgres + Realtime + auth anonyme)
- Déploiement Vercel

## Architecture

- `lib/coinche/` : moteur de règles **pur** et testé (cartes, distribution,
  enchères, plis, scoring, bots, vue expurgée). Aucune dépendance framework.
- `lib/server/` : Server Actions autoritaires. L'état complet (mains cachées)
  vit dans Supabase et n'est jamais envoyé au client : chaque joueur ne reçoit
  qu'une vue expurgée (`redact`).
- `lib/client/` : hook Realtime qui rafraîchit la vue à chaque changement.
- `app/`, `components/` : UI (accueil, lobby, table de jeu).
- `supabase/migrations/` : schéma SQL + RLS.

## Démarrage

Voir `docs/RUNBOOK.md` pour l'installation, les variables d'environnement,
les tests et le déploiement.

```
npm install
npm test
npm run dev
```
