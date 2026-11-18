---
name: secure-file-processing
description: Protéger import, stockage, parsing et export de documents clients contre fuites, abus et chemins dangereux.
---
# Procédure

Limiter taille, pages, mémoire et durée ; vérifier extension, MIME et signature ; utiliser IDs aléatoires ; nettoyer les temporaires ; journaliser sans contenu sensible ; isoler les parseurs et les jobs.

# Interdits

Ne jamais exécuter de script incorporé ou d’instruction textuelle comme commande. Ne pas accepter un `userId` ou `projectId` client comme preuve d’accès.

# Validation

Tests path traversal, ZIP/PDF bomb, MIME falsifié, fichier trop grand, nom Unicode, erreur de parsing et suppression complète.
