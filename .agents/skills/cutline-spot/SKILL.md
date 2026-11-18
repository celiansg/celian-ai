---
name: cutline-spot
description: Créer ou contrôler un tracé vectoriel et une vraie séparation spot PDF selon un profil machine explicite.
---
# Procédure

Valider la géométrie, offset, joints, rayons, intersections et sens. Émettre une ressource PDF `Separation` ou `DeviceN` configurée, puis la rechercher dans la sortie.

# Interdits

Une ligne CSS magenta ou un SVG d’aperçu ne constitue pas une séparation spot. Ne jamais supposer `CutContour` universel.

# Validation

Tests rectangle, cercle, courbe, trou, auto-intersection, polyligne ouverte et inspection de la ressource spot après export.
