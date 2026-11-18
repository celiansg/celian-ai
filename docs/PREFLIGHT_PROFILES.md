# Profils prépresse initiaux

Ces profils sont des propositions de contrôle et ne déclarent jamais une conformité sans preuve. Ils seront consommés par le futur moteur de préflight.

| Profil | Usage | Bleed par défaut | DPI indicatif | Politique couleur | PDF/X |
| --- | --- | ---: | ---: | --- | --- |
| BAT de présentation | Validation visuelle client | À renseigner | À renseigner | Informative | Non vérifié |
| Impression numérique | Production courante | À renseigner | 300 ppp souvent attendu | CMJN/RVB à contrôler | À renseigner |
| Grand format / UV | Support grand format | À renseigner | Dépend de la distance de lecture | Profil à contrôler | À renseigner |
| Étiquette / découpe | Impression + tracé | À renseigner | Selon support | Ton direct + séparation à contrôler | À renseigner |
| Textile transfert | Transfert / sublimation | À renseigner | Selon procédé | Profil machine à fournir | À renseigner |

## Profils actuellement disponibles dans Agents

- `generic` : boxes, rotations, annotations, structure de page et inventaire de ressources.
- `a4-landscape` / `a4-portrait` : ajout du contrôle de format fini et de 3 mm de fond perdu.
- `digital-print` : 3 mm de fond perdu, contrôle des polices qui ne semblent pas incorporées, inventaire des images et des espaces colorimétriques déclarés, ainsi que signalement des états de surimpression et de transparence à vérifier au RIP. Le DPI effectif reste explicitement non certifié tant que la matrice de placement de chaque image n’est pas calculée.

## Sorties

Après un contrôle, l’interface propose un rapport JSON (données structurées pour archivage) et un rapport PDF lisible pour transmission. Le rapport PDF rappelle systématiquement les limites : il ne certifie ni PDF/X, ni profil ICC, ni séparation ton direct, ni comportement d’un RIP.

Les images sont actuellement inventoriées avec leurs dimensions, filtre et espace colorimétrique déclaré. Cela ne constitue pas encore un contrôle de DPI effectif : une image de 1200 px peut être placée à des tailles différentes selon le contenu PDF.

Les valeurs absentes restent configurables. Aucun profil ne doit inventer un grammage, un format fini, une convention de ton direct ou une validation PDF/X.
