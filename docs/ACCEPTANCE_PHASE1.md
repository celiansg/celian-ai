# Acceptation phase 1 — fichiers réels

## Définition de terminé

- [ ] Le bouton et le drag-and-drop acceptent PDF, PNG, JPG, SVG, DOCX, XLSX, TXT et ZIP selon les limites affichées.
- [ ] Le fichier est sauvegardé localement dans IndexedDB avec metadata et Blob.
- [ ] Le fichier réapparaît après rechargement du navigateur.
- [ ] Un PDF peut être ouvert dans une preview multi-page avec zoom et navigation.
- [ ] Un type ou une taille interdite produit une erreur et aucune entrée n’est créée.
- [ ] La suppression est confirmée, réelle et limitée au fichier choisi.
- [ ] Le statut indique local uniquement ; aucun upload cloud implicite.
- [ ] `typecheck`, `lint`, `build` et les tests dédiés passent.
- [ ] Le fichier original n’est jamais modifié par la preview.

## Limites assumées

- La preview n’est pas encore un préflight technique.
- Les documents DOCX/XLSX/TXT/ZIP sont stockés, pas interprétés.
- La liaison aux projets et aux outils agents arrive après la première tranche de stockage.
- Le modèle BAT officiel est maintenant reçu et vérifié ; la génération BAT reste distincte et ne commencera qu’après création du mapping de zones et d’un test golden master.
