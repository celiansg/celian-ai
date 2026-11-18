---
name: ai-orchestration
description: Orchestrer les sept agents avec outils allowlistés, événements publics, approbations et consentement provider.
---
# Procédure

Router la demande, charger le contexte minimal, exécuter au plus `maxSteps`, publier uniquement des résumés d’action, persister run/events et reprendre après question ou approval.

# Garde-fous

Le modèle ne choisit pas de shell arbitraire. Une action externe, destructive, coûteuse ou un transfert de fichier vers un provider exige une approval explicite. Un outil non confirmé ne produit jamais un badge succès.

# Validation

Tests route directe, handoff, boucle, erreur 429/5xx, provider absent et refus d’action.
