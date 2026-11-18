# Matrice de tests

## Baseline phase 0

| Commande | Résultat initial |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| Tests unitaires | Aucun script présent |
| Tests e2e | Aucun script présent |
| Tests Python | Aucun service Python présent |

## Phase 1

### Vérifications exécutées le 17/11/2026

| Vérification | Résultat |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| Serveur production `next start -p 3101` | PASS — serveur prêt |
| `GET /files` | PASS — HTTP 200 |
| `GET /pdf.worker.min.mjs` | PASS — HTTP 200 |
| État initial de la bibliothèque dans le navigateur | PASS — état vide explicite, sans donnée injectée |
| Création d’un projet dans le navigateur | PASS — visible après création |
| Rechargement puis projet retrouvé | PASS — projet relu depuis IndexedDB |
| Création d’une tâche liée au projet | PASS — projet et priorité visibles dans la liste |
| Dashboard après création | PASS — compteurs, projet et tâche visibles |
| Calendrier sans échéance | PASS — état vide explicite, sans faux événement |
| `GET /api/bat/template` | PASS — template disponible, A4 paysage, PDF/X-4, 1 page |
| `POST /api/bat/generate` | PASS — copie brouillon PDF générée depuis le template officiel |
| Rendu PNG du BAT brouillon | PASS — champs lisibles, remarques dans leur zone, original inchangé |
| Smoke test production locale sur `/`, `/agents`, `/projects`, `/tasks`, `/calendar`, `/files`, `/settings` | PASS — HTTP 200 |
| Smoke test production locale `GET /api/bat/template` | PASS — HTTP 200 |

Le parcours import réel par sélection de fichier, rechargement, preview et suppression reste à automatiser dans un test Playwright dédié. Le parcours projets/tâches/dashboard/calendrier a été vérifié manuellement dans le navigateur de production locale, sans réponse simulée de succès.

| Cas | Type | Attendu |
| --- | --- | --- |
| Déposer un PDF | UI/e2e | metadata et Blob persistés localement |
| Recharger la page | e2e | fichier retrouvé depuis IndexedDB |
| Ouvrir un PDF | UI | pages rendues, pagination et zoom visibles |
| Déposer un type non supporté | UI | erreur lisible, aucune entrée persistée |
| Dépasser 25 Mo | UI | erreur lisible, aucun fichier stocké |
| Supprimer | UI | confirmation puis suppression réelle |
| Source multipage | UI | page sélectionnable, navigation contrôlée |
| Erreur IndexedDB | intégration | état erreur, aucune fausse réussite |
| Mode sans Gemini | intégration | dépôt/preview fonctionnent sans clé IA |

## À ajouter ensuite

### Authentification serveur IA

- `tests/firebase-auth.test.mjs` couvre le mode invité localhost, le refus cross-site, les JWT expirés ou d’un autre projet, le compte Firebase non vérifié/désactivé et l’indisponibilité de Firebase.
- Les routes IA ont été exercées sans clé et sans session : elles renvoient une erreur JSON lisible, sans exécuter un provider non configuré.

### Chat vers tâches

- Le test navigateur `tests/browser/chat-task.txt` a confirmé la création d’une tâche par @Prod, la reprise du fil avec l’identifiant enregistré et la présence d’une seule tâche dans la page Tâches après rechargement. Le flux du modèle est fourni par le test. Le navigateur et IndexedDB sont réels.
- Pour le rejouer depuis un profil navigateur neuf, démarrer la build avec `npx next start -p 3113`, ouvrir une session Playwright CLI et exécuter `playwright-cli -s=agents-task-check run-code --filename tests/browser/chat-task.txt`.
- `npm test` (Node.js 22 ou supérieur) couvre aussi les entrées invalides, les projets absents et les erreurs d’écriture. Gemini et Firestore authentifié restent à vérifier séparément.

### Autres vérifications restantes

- Fixtures PDF synthétiques et assertions boxes/DPI.
- Tests API Zod et ownership.
- Playwright import → preview → delete.
- Tests golden master BAT après stabilisation du profil de zones et du mapping du template officiel reçu.

### Atelier BAT manuel, mapping 1.1.0

- Build de production, TypeScript, ESLint et les six tests Node exécutés avec succès.
- Test de production locale avec Playwright à 390 px : accès depuis le dashboard, saisie des dix champs et des remarques, refus HTTP 422 d’une finition trop longue, correction, choix de la page 2 d’un PDF de deux pages, rendu dans le lecteur et téléchargement. La requête contient uniquement les champs du formulaire.
- Réouverture Poppler : une page A4 paysage, sans déclaration PDF/X-4 héritée. À 120 ppp, les pixels hors des zones de champs, remarques et visuel sont strictement identiques à l’original. Revue visuelle des dix lignes, des remarques et de la page 2 orientée à 90° dans le cadre. Empreinte du modèle officiel inchangée.

### Historique BAT par projet

- Test Playwright `tests/browser/bat-archive.txt` sur la build de production locale : migration de la bibliothèque IndexedDB v1 avec conservation du fichier existant, accès depuis Projets, création des versions v1 et v2 de la même commande avec rechargement intermédiaire, ouverture de la v1, vérification des deux versions et de leur projet dans Fichiers.
- Pour rejouer ce test, démarrer la build avec `npx next start -p 3115`, ouvrir un profil Playwright neuf et exécuter `playwright-cli -s=agents-bat-archive run-code --filename tests/browser/bat-archive.txt`.

### BAT multipage

- Playwright sur la build de production à 390 px. Export unitaire de la page 2, puis export complet de trois pages, navigation dans l’aperçu et téléchargement. Le PDF client est assemblé localement, le POST contient les champs du formulaire.
- Réouverture avec PDF.js. La version unitaire contient seulement le visuel B. La version complète contient le visuel A, le visuel B à 90° et un cadre vide dans cet ordre. La référence de commande est présente une fois par page.
- Comparaison Poppler à 100 ppp et revue visuelle. Chaque page A4 est identique au modèle rempli en dehors du cadre du visuel. L’export unitaire est identique pixel pour pixel à la page 2 de l’export complet.

### BAT vers brouillon client

- `tests/browser/bat-to-mail.txt` sur la build locale à 390 px. Après rechargement de l’atelier, ouverture du BAT archivé, reprise de la référence et du produit, fichier associé disponible, génération puis édition du mail, copie réelle dans le presse-papiers. Le parcours de rédaction et de copie n’a émis aucun POST.
- Avec un identifiant de BAT absent, le formulaire manuel reste utilisable. Deux tests Node vérifient le texte de révision et la conservation exacte d’un lien fourni. TypeScript, ESLint, build et huit tests Node passent.
- Rejouer le parcours avec la build démarrée par `npx next start -p 3117` et un profil Playwright neuf.
- Historique local vérifié avec le même parcours : enregistrement de deux versions éditées, ouverture de la première depuis `/mail`, restauration de son texte et de son PDF après rechargement, absence de requête POST pendant les opérations de rédaction et d’historique.

### Rédaction assistée avec Gemini

- Onze tests Node réussis. Les nouveaux cas couvrent le consentement, le schéma strict, les liens, les extraits cités et l’exclusion des montants.
- Build locale sur le port 3118. Appel direct sans consentement : HTTP 400. Test `tests/browser/mail-gemini.txt` à 390 px : bouton verrouillé avant accord, HTTP 503 réel sans clé, conservation du texte en cours. Une réponse simulée couvre le chargement d’une réponse structurée et l’affichage des extraits.
- Une clé Gemini est requise pour vérifier la génération de bout en bout avec le fournisseur. La route de rédaction ne possède pas encore de garde d’authentification propre ni de quota utilisateur.
