# Notes de version

## 2026-11-17 — Phase 0

- Audit du dépôt et des routes réalisé.
- Baseline `typecheck`, `lint`, `build` validée.
- Risques de faux succès, identité utilisateur codée en dur, double orchestration et stockage éphémère documentés.
- Documentation architecture, sécurité, roadmap, profils, tests, licences et acceptation créée.
- Modèle officiel `BAT template(1).pdf` signalé manquant à la date de l’audit initial.

## 2026-11-17 — Réception du template BAT officiel

- `BAT template(1).pdf` fourni par l’utilisateur et vérifié comme PDF/X-4 A4 paysage d’une page, sans formulaire.
- Copie de travail locale ajoutée dans `knowledge/templates/`.
- Empreinte SHA-256 enregistrée dans le profil source ; le PDF est conservé dans les ressources du projet pour que l’atelier soit disponible après déploiement.
- La phase BAT est débloquée pour le profilage et le mapping ; aucune génération n’est encore présentée comme réalisée.

## 2026-11-17 — Phase 1, tranche fichiers local-first

- Ajout d’une bibliothèque locale réellement persistante via IndexedDB.
- Validation des extensions/MIME et d’une taille maximale de 25 Mo avant écriture.
- Ajout du dépôt par sélection ou glisser-déposer, inspiré du composant 21st.dev File Dropzone (id 19201) et adapté au design Agents.
- Ajout de la liste des fichiers, metadata, suppression confirmée et états loading/empty/error.
- Ajout de la preview PDF multi-page avec pagination, zoom et worker PDF.js servi localement.
- Ajout des previews image ; les formats bureautiques/ZIP sont conservés localement mais restent sans lecteur intégré.
- Vérifications : typecheck, lint, build, serveur de production local, `/files` et worker PDF HTTP 200.
- `pdfjs-dist@4.10.38` ajouté ; le worker minifié est servi depuis `public/`.

## 2026-11-17 — Fonctionnalités workspace et runner

- Projets, tâches et activités disposent maintenant d’un repository IndexedDB local partagé.
- Les pages Projets, Tâches et Calendrier proposent de vrais formulaires, filtres, statuts, suppression confirmée et états vides.
- Dashboard et rail latéral lisent les compteurs et éléments réellement enregistrés localement.
- Le runner utilise les adapters Gemini/OpenAI réels et orchestre les spécialistes détectés par le routeur ; l’absence de clé renvoie une erreur de configuration explicite.
- Les outils serveur qui ne peuvent pas atteindre le stockage local du navigateur ne déclarent plus de faux succès.
- Tests de contrat ajoutés dans `tests/acceptance-contract.test.mjs` et script `npm test`.

## 2026-11-17 — Cohérence du runner et contexte conversationnel

- Suppression du `MockProvider` de production ; Gemini et OpenAI sont maintenant les seuls adapters exposés par le registre provider.
- Les outils du runner lisent uniquement les métadonnées de workspace explicitement transmises et refusent les écritures quand aucun repository authentifié n’est disponible.
- Les handoffs du runner sont limités à trois niveaux pour éviter une délégation récursive sans fin.
- La délégation `Agent` du chat transmet désormais le contexte projet/tâches/fichiers/activité déjà chargé par l’interface.

## 2026-11-17 — Authentification serveur des routes IA

- Ajout de la vérification Firebase côté serveur pour le chat, le runner et la rédaction de mails assistée.
- Ajout d’un mode invité strictement limité au développement sur localhost quand l’authentification obligatoire est désactivée.
- Ajout de l’envoi automatique du jeton Firebase depuis les clients concernés sans exposer de clé IA.
- Ajout de cinq tests de contrat ; `npm test` compte maintenant 16 tests passants.
- Typecheck, lint et build de production repassés avec succès après intégration.

## Prochaine livraison

Relier les fichiers aux projets avec un identifiant de projet réel, puis profiler le template BAT officiel avant toute génération.
