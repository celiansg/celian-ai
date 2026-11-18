# Décisions techniques

## D-001 — Conserver Agents et les sept agents

Décision : les identifiants, avatars, palette et shell actuels restent les contrats de compatibilité. Les modules métier sont des outils appelables, pas de nouveaux personnages.

## D-002 — Local-first pour les fichiers

Décision : démarrer par IndexedDB côté navigateur. Raison : confidentialité des documents clients, fonctionnement gratuit et absence de Storage Firebase configuré. Toute synchronisation cloud sera explicite.

## D-003 — Aucun BAT sans template officiel vérifié

Décision : ne pas reconstruire le PDF AFLPH Coloz à partir d’une description. Le fichier `BAT template(1).pdf` fourni est la source officielle conservée dans `knowledge/templates/` pour rester disponible après déploiement. Toute sortie sera une nouvelle copie contrôlée ; l’original restera inchangé.

## D-004 — Les moteurs déterministes priment sur le LLM

Décision : dimensions, boxes, DPI, géométrie et intégrité PDF sont mesurés par outils techniques. Le LLM peut extraire, expliquer ou proposer, jamais certifier seul.

## D-005 — 21st.dev comme accélérateur, pas comme identité imposée

Décision : rechercher les composants avant création. Le File Dropzone 21st.dev id 19201 est utilisé comme référence/source de structure, adapté aux tokens Agents et aux contraintes local-first.

## D-006 — Pas de double backend implicite

Décision : documenter Firebase et Supabase comme deux états historiques, mais choisir un repository actif par fonctionnalité. La phase 1 ne dépend pas de l’un ou l’autre.
