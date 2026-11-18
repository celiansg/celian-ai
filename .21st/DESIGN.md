# Direction UI Agents

## Intent

Agents doit ressembler à un atelier personnel calme et précis, pas à un dashboard SaaS rempli de métriques. Le geste principal est déposer un fichier, le comprendre, puis décider de l’étape suivante.

## Composition

- Sidebar persistante sur desktop, drawer sur mobile.
- Pages métier en trois zones quand une preview est nécessaire : sources, aperçu, contrôles.
- Les sorties et alertes importantes sont alignées avec les contrôles qui les ont produites.
- Les états vides expliquent l’action suivante au lieu de remplir l’écran avec des chiffres fictifs.

## UI 21st.dev

La recherche 21st.dev a identifié `File Dropzone` (id 19201) pour le dépôt, la validation de type/taille, la liste des fichiers et la suppression. Son code a été récupéré puis adapté aux tokens Agents et à la persistance IndexedDB ; aucune dépendance shadcn inutile n’est ajoutée.

## Contraintes

- Français, phrase case, libellés orientés action.
- Focus visible, boutons tactiles, clavier et `prefers-reduced-motion`.
- Aucun gradient décoratif ajouté sans fonction produit.
