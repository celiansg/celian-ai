# Roadmap Agents

## Phase 0 — Audit et sauvegarde

État : documentation initiale créée. Le dépôt compile. Le modèle BAT officiel est maintenant reçu et vérifié localement. Les mocks critiques sont recensés.

## Phase 1 — Fichiers réels et atelier PDF de base

Première tranche livrée : stockage IndexedDB local, metadata persistantes, suppression confirmée, dépôt inspiré 21st.dev, preview PDF multi-page, preview image, ouverture/retour d’erreur, projets/tâches/calendrier/dashboard reliés au même stockage et vérifications de service.

Reste : tester le parcours complet import/reload/delete avec Playwright, relier les fichiers aux projets, intégrer les jobs hors requête et ajouter l’API authentifiée si le mode cloud est activé.

## Phase 2 — BAT officiel

L’atelier `/bat` remplit le modèle officiel et insère localement une page ou toutes les pages du PDF client, en conservant leurs proportions et leurs vecteurs. Le brouillon peut être prévisualisé, téléchargé et retrouvé dans l’historique local du projet. Depuis une version archivée, il ouvre un brouillon de mail avec les champs de référence disponibles. Le placement manuel et l’extraction de faits restent à intégrer.

## Phase 3 — Mails IA

L’atelier `/mail` produit un brouillon éditable à partir de modèles locaux et reprend la commande et le produit d’un BAT archivé. Les versions enregistrées peuvent être rouvertes avec leur PDF associé. Une rédaction structurée avec Gemini est branchée après accord explicite, avec conservation du brouillon local en cas d’échec. Restent le test avec une vraie clé, la reformulation à partir du brouillon et l’intégration de validation avant envoi.

## Phase 4 — Préflight PDF

Ajouter profils, boxes, DPI effectifs, polices, couleurs, rapports JSON/PDF et limites explicites.

## Phase 5 — Fonds perdus

Commencer par PDF raster simple, afficher la méthode et l’impact de rasterisation, puis étendre prudemment.

## Phase 6 — Découpe

Créer géométrie validée et vraie séparation spot PDF, avec profils machine configurables.

## Phase 7 — BTS et orchestration reliée

Importer les cours, citer les pages, sauvegarder quiz/progrès et orchestrer des outils réels.

## Phase 8 — Polish et emballage

QA responsive, raccourcis, sauvegarde/export, installation Windows, PWA et documentation utilisateur.
