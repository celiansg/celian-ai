# Agents — règles de développement

## Produit

Agents est un workspace local-first pour fichiers clients, prépresse, relation client et BTS ERPC. Les sept agents existants (`celian`, `prod`, `client`, `design`, `dev`, `business`, `bts`) et leur identité visuelle sont stables.

## Architecture

- UI : Next.js App Router, React, TypeScript, CSS existant et composants Agent Elements.
- Métier : `lib/ai`, `lib/local-files`, `knowledge/procedures`.
- Persistance actuelle : Firebase optionnelle ; les fichiers de la phase 1 restent locaux tant qu’un opt-in cloud explicite n’existe pas.
- IA : uniquement côté serveur, derrière la frontière provider et des outils allowlistés.
- PDF : un moteur technique vérifiable, jamais le LLM, décide des mesures et des sorties.

## Commandes standard

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Règles de qualité

- Ne jamais présenter une écriture, un envoi, une validation ou un traitement comme réalisé sans confirmation réelle.
- Une donnée de production absente reste vide, manquante ou explicitement suggérée.
- Toute sortie PDF est nouvelle et l’original est conservé.
- Les actions externes, destructrices ou engageantes demandent une approbation.
- Valider MIME, taille, extension, contenu et permissions côté serveur ou dans le périmètre local documenté.
- Ne jamais envoyer un fichier client vers un provider IA sans consentement explicite.
- Toute nouvelle capacité possède des états loading, empty, error, success vérifié et une trace de test.

## Méthode de livraison

Une phase est terminée seulement si son parcours UI réel, son service, sa persistance, ses erreurs et ses tests sont documentés dans `docs/`. Les composants 21st.dev sont recherchés avant la création d’un composant UI complexe, puis adaptés aux tokens Agents.

## Définition de terminé

Voir `docs/ACCEPTANCE_PHASE1.md` et le cahier des charges `PROMPT_MAITRE_CODEX_AGENTS_V2.md` fourni dans `Downloads`.
