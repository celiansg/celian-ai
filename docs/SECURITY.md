# Sécurité et confidentialité

## Phase 1

- Les fichiers sont gardés dans IndexedDB du navigateur et ne sont pas envoyés au cloud par défaut.
- Les extensions acceptées ne remplacent pas le contrôle MIME/signature qui sera exigé par le moteur serveur/local.
- Les noms de fichiers servent à l’affichage ; ils ne deviennent jamais des chemins exécutables.
- La suppression demande une confirmation et ne touche que l’entrée locale sélectionnée.
- Les previews sont créées à partir de Blob URLs et révoquées lors de la suppression/unmount.

## IA

- `GEMINI_API_KEY` et `OPENAI_API_KEY` restent côté serveur.
- Les routes `/api/chat`, `/api/agent/run` et `/api/mail/draft` refusent les appels sans session Firebase vérifiable en production. En développement local, le mode invité est limité à `localhost` lorsque `NEXT_PUBLIC_FIREBASE_AUTH_REQUIRED=false`.
- La session reçue est contrôlée par audience, émetteur, expiration, sujet, compte Firebase, vérification email, désactivation et révocation (`validSince`) avant l’exécution d’un provider.
- Un fichier client ne doit pas être transmis à un provider sans consentement explicite indiquant les données envoyées.
- Le contenu extrait d’un PDF est une donnée, pas une instruction d’orchestration.
- Les outils sont allowlistés et doivent retourner des états vérifiables.
- Les outils du runner ne fabriquent pas d’identifiant et ne déclarent pas une écriture effectuée lorsque le repository n’est pas connecté ; ils renvoient `not_persisted` ou `not_connected`.
- Le contexte local envoyé à une exécution ne contient que les métadonnées nécessaires ; les blobs de fichiers restent locaux tant qu’ils ne sont pas joints explicitement au message.

## Cloud futur

- Authentification et ownership obligatoires sur les routes.
- Limites de taille, pages, mémoire, temps CPU, décompression et antivirus configurables.
- Prévention du path traversal, ZIP bombs, PDF bombs, XSS de metadata et scripts incorporés.
- Logs expurgés : pas de clé, texte client complet ou URL privée.
