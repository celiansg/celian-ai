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

État : première tranche fonctionnelle livrée. Les profils contrôlent les boxes, rotations, annotations, pages, polices, images et espaces colorimétriques déclarés. Les rapports JSON et PDF sont téléchargeables. Les contrôles de surimpression et de transparence sont inventoriés avec avertissement RIP. Le DPI effectif, PDF/X et les profils ICC restent explicitement non certifiés.

## Phase 5 — Fonds perdus

État : fond perdu raster disponible avec valeur libre en millimètres, répétition du dernier pixel, étirement du bord, miroir et zone blanche. La sortie conserve TrimBox/BleedBox et affiche l’impact de la rasterisation. Reste : contrôle visuel automatisé et traitement avancé des profils colorimétriques.

## Phase 5b — Imposition de contrôle

État : imposition vectorielle simple disponible sur `/bat` en N-up ou répétition d’une page, avec feuilles A4/A3, grille, marges et blancs entre poses. Les repères, compensations machine, cahier, recto-verso et retournement restent à intégrer séparément.

## Phase 6 — Découpe

État : tracé rectangulaire vectoriel disponible sur `/bat`. L’utilisateur peut le placer sur la zone de rognage ou définir une largeur et une hauteur en millimètres ; le rectangle personnalisé est centré dans le TrimBox. Le nom du ton direct, l’épaisseur, la page cible ou toutes les pages sont configurables. L’export installe une vraie séparation PDF `Separation` avec surimpression et signale qu’un contrôle RIP reste nécessaire.

Reste : géométries libres ou importées, angles/arrondis, trous, profils machine et validation visuelle automatisée de la séparation.

## Phase 7 — BTS et orchestration reliée

Importer les cours, citer les pages, sauvegarder quiz/progrès et orchestrer des outils réels.

## Phase 8 — Polish et emballage

QA responsive, raccourcis, sauvegarde/export, installation Windows, PWA et documentation utilisateur.
