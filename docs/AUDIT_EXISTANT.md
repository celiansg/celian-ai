# Audit de l’existant — 17/11/2026

## Périmètre et méthode

Audit réalisé par lecture du dépôt, de `package.json`, du lockfile, des routes App Router, des composants UI, des services IA/Firebase, des règles Firestore/Storage et des variables d’environnement. `npm run typecheck`, `npm run lint` et `npm run build` ont été exécutés avant modification et passent avec le code actuel.

Le cahier des charges maître a été lu intégralement depuis le fichier fourni dans `C:\Users\csegu\Downloads\PROMPT_MAITRE_CODEX_AGENTS_V2.md`. Le fichier officiel `BAT template(1).pdf` a ensuite été fourni dans `C:\Users\csegu\Downloads`, vérifié puis copié sous `knowledge/templates/` comme ressource nécessaire au déploiement.

## Inventaire vérifié

| Composant / chemin | Constat réel | État | Risque / dette | Action prévue |
| --- | --- | --- | --- | --- |
| `app/page.tsx`, `components/dashboard-view.tsx` | Dashboard visuel, barre de commande et trace d’exécution via `/api/agent/run` | Partiel | Les compteurs sont fixes à zéro et le runner peut être mocké | Remplacer par lectures de données réelles, puis unifier le run |
| `components/sidebar.tsx`, `topbar.tsx`, `workspace-layout.tsx` | Shell Agents, navigation, drawer mobile | Fonctionnel UI | Aucune garde d’authentification dans le layout | Ajouter un état de session explicite et préserver le shell |
| `app/agents/page.tsx`, `app/agents/[id]/page.tsx` | Sept agents configurés, avatars, chat Agent Elements | Fonctionnel partiel | Le chat est réel si la clé existe, mais les outils associés ne persistent pas | Brancher les outils et tracer les résultats réels |
| `components/agent-elements/` | Message list, markdown, input, fichiers, tools, plan, question, model picker | Fonctionnel UI | Les pièces jointes sont seulement transmises au chat ; aucun stockage durable | Réutiliser les primitives et afficher le statut de stockage |
| `lib/ai/agents/index.ts` | Configuration centralisée des sept agents, suggestions, permissions | Fonctionnel | Modèle Gemini figé et capabilities encore déclaratives | Valider les modèles disponibles et rattacher aux outils réels |
| `app/api/chat/route.ts` | `streamText` AI SDK, Gemini/OpenAI, outils structurés et approvals UI | Partiel | Outils projet/tâches/fichiers/activité/email simulés ; `current-user` codé en dur ; projet arbitraire accepté | Introduire contexte local/auth et adapters persistants ; interdire faux succès |
| `app/api/agent/run/route.ts` | Second chemin de routage par mots-clés | Fonctionnel partiel | Fournisseur réel, routeur déterministe et handoffs bornés ; persistance des runs encore à brancher | Conserver comme endpoint de run public, puis ajouter persistence/auth stricte |
| `lib/ai/orchestration/runner.ts` | Boucle max 8, événements et handoff | Fonctionnel partiel | Fournisseurs réels, outils contextualisés et handoffs bornés ; persistance de run/events encore à brancher | Ajouter runs persistants et contrats d’événements durables |
| `lib/ai/providers/index.ts` | Interface AIProvider Gemini/OpenAI | Fonctionnel | Les adapters réels renvoient une erreur de configuration si la clé manque | Ajouter tests d’intégration avec clés de test hors CI |
| `lib/ai/tools/index.ts` | Définitions structurées | Contrat sécurisé | Les lectures utilisent le contexte transmis ; les écritures restent explicitement `not_persisted` sans repository authentifié | Brancher un repository serveur/authentifié pour les écritures |
| `lib/ai/memory/` | Retours fixes « prête à être branchée » | Mock | Aucun historique ou mémoire après redémarrage | Ajouter repositories et résumé ciblé |
| `app/files/page.tsx` | Sélection navigateur et liste dans `useState` | Mock local éphémère | Refresh = perte, aucune preview ni suppression | Phase 1 : IndexedDB + preview PDF.js + metadata réelle |
| `app/projects/page.tsx` | EmptyState uniquement | Empty | Aucun CRUD | Ajouter repository et premier flux projet |
| `app/tasks/page.tsx` | EmptyState uniquement | Empty | Aucun CRUD | Ajouter repository et tâches réelles |
| `app/calendar/page.tsx` | Date courante + EmptyState | UI | Pas de données d’échéance | Brancher tâches et événements internes |
| `app/settings/page.tsx` | Statuts provider/intégrations | UI partiel | Utilise `process.env` côté page statique, pas de test réel de connexion | Endpoint serveur de statut sans secrets |
| `lib/firebase/client.ts`, `auth.ts` | Firebase client, Google et magic link | Partiel | Firebase optionnel ; pas de protection globale des routes ; URL magic link localhost | Choisir/documenter local-first, puis auth explicite |
| `lib/firebase/data.ts` | Projects/tasks/activity Firestore | Partiel | Pas de list/create tasks, pas d’ownership serveur pour API | Adapters avec session et règles cohérentes |
| `lib/firebase/storage.ts` | Upload Firebase Storage, MIME/taille côté client | Partiel | Spark interdit Storage sur nouveaux projets ; path inclut nom brut ; pas de hash/signature | Phase 1 local-first, cloud opt-in après sécurité |
| `firestore.rules`, `storage.rules` | Règles d’ownership et contrôle MIME | Base utile | Schéma et services ne sont pas utilisés par les routes IA | Tester règles et ne pas contourner par route serveur |
| `supabase/schema.sql` | Schéma riche et RLS | Non utilisé | Double stratégie Firebase/Supabase | Conserver comme historique, choisir Firebase/local-first et documenter |
| `public/avatars`, `public/agents`, PWA | Avatars/logo/manifeste/service worker | Fonctionnel statique | Duplication agents/avatars | Centraliser les références sans casser les URLs |
| `knowledge/templates/BAT template(1).pdf` | Modèle officiel fourni, A4 paysage, 1 page, PDF/X-4, sans formulaire | Source vérifiée | Mapping de champs non créé | Mesurer les zones, créer un profil versionné et produire uniquement des copies contrôlées |
| Tests | Aucun test `test/spec/e2e/pytest` versionné détecté | Absent | Régressions non détectées | Créer tests de caractérisation puis fixtures synthétiques |

## Diagramme de l’existant

```text
UI dashboard ───────────────┐
UI chat ────── /api/chat ────┼── AI SDK réel si clé configurée
UI dashboard ─ /api/agent/run ── Gemini/OpenAI + runner borné
                               ├── outils contextualisés / écritures refusées sans repository
                               ├── mémoire fixe
                               └── Firebase seulement dans quelques écrans

Fichiers : File[] dans useState → perdus au refresh
Firebase / Supabase : deux schémas, aucun chemin métier unifié
```

## Risques prioritaires

### P0

- Faux succès dans les outils chat (`created`, `recorded`, `approved_pending_integration`) sans écriture ni envoi réel.
- `current-user` codé en dur et `requestedProjectId` accepté par le modèle sans contrôle d’accès.
- Fichiers client transmis au provider via le chat sans statut explicite de consentement et de stockage.

### P1

- Route `/api/agent/run` simulée et divergente de `/api/chat`.
- Aucun stockage durable des fichiers, conversations, mémoire, runs ou events.
- Auth Firebase non imposée par le shell ou les routes.
- Modèle `gemini-3.5-flash-lite` non validé contre la disponibilité réelle.

### P2

- Pas de tests automatisés ni corpus PDF.
- Pages projets/tâches/calendrier encore vides.
- Intégrations Gmail/Drive/Calendar/GitHub/Vercel non connectées.
- Licence et sélection des moteurs PDF à formaliser avant distribution.

## Plan de migration minimal

1. Ajouter documentation, profils et tests de caractérisation sans changer l’UI.
2. Implémenter le stockage local immuable des fichiers et la preview PDF multi-page.
3. Remplacer les outils fichiers par des adapters qui retournent `stored|not_found|error`, jamais un faux `success`.
4. Exploiter le template BAT officiel reçu pour créer un profil de zones et un mapping versionné, sans modifier l’original.
5. Unifier progressivement les runs et la mémoire, puis activer l’IA avec consentement.
