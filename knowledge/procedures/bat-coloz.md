# Procédure BAT AFLPH Coloz

Le PDF officiel est une dépendance obligatoire. Vérifier sa présence et sa révision avant toute génération. Lire les faits de commande, demander confirmation des suggestions, remplir uniquement les champs mappés, garder les remarques vides si aucune remarque n’est fournie, préserver la zone de validation et produire une nouvelle version contrôlée.

Le mapping initial est versionné dans `knowledge/templates/BAT-template.mapping.v1.json`. L’API `POST /api/bat/generate` produit une copie `draft-unvalidated` en conservant le template source ; la zone visuelle de droite n’est pas encore alimentée automatiquement. Une sortie reste `draft` jusqu’à l’approbation humaine et n’est jamais présentée comme lancée en production.
