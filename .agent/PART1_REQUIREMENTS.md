# Partie 1 — exigences et questions ouvertes

Le contrat de données de la Partie 1 est dans `src/part1/reportData.ts`, sa validation pure dans `src/part1/reportDataValidation.ts` et l'interface contrôlée dans `src/part1/Part1ReportForm.tsx`. L'interface est accessible depuis l'espace « 01 · Informations du rapport » de `App`. `src/part1/part1Pptx.ts` construit les quatre pages administratives A4, un sommaire d'une ou plusieurs pages et trois pages d'introduction. Les pages utilisent les données validées et les quatre visuels importés. L'assemblage avec la Partie 2 et l'export utilisateur du rapport unifié ne sont pas encore implémentés. Sources : `docs/PPPT_donnees_entree_a_confirmer.md` et inspection de `docs/PPPT PART1+PART2 .pptx`. Les exemples du modèle sont des données d'une copropriété de démonstration, pas des valeurs par défaut à injecter dans un rapport.

## Périmètre attesté par le modèle présent

Le modèle contient 21 diapositives A4 portrait. La Partie 1 couvre les diapositives **1 à 9** et s'arrête immédiatement avant « 2. Identification et hiérarchisation des travaux et observations », qui commence à la diapositive 10. Le fichier d'inventaire métier décrit un ancien PPT limité à 9 diapositives ; son constat sur l'absence de Partie 2 est donc ancien, mais son inventaire des entrées de la Partie 1 reste pertinent sous réserve de vérification champ par champ.

| Diapositive | Contenu de référence observé | Entrées de projet à utiliser |
| --- | --- | --- |
| 1 | Couverture PPPT, France Verte, mission, coordonnées, photo du bâtiment | Nom/adresse copropriété, syndic, date de visite, date du rapport, version, photo principale ; nombre final de pages calculé. |
| 2 | Informations administratives et localisation cadastrale | Syndic et adresse, chargé de projet et fonction, vérificateur et fonction, intervenant sur site, référence cadastrale, extrait cadastral ; identité France Verte issue du modèle. |
| 3 | Description de la copropriété et vue aérienne rapprochée | Nom/adresse, construction, dates et numéro d'immatriculation, bâtiments, entrées, lots, niveaux, lots principaux et d'habitation, chauffage, ascenseurs, SHAB, altitude, vue aérienne. |
| 4 | Statut patrimonial, tableau explicatif et carte d'environnement | États Concerné / Non concerné des trois situations décrites par l'inventaire, visuel patrimonial ; « Votre situation » est seulement le titre de la zone qui regroupe ces trois listes déroulantes. |
| 5–6 | Sommaire | Le générateur accepte uniquement des rubriques effectivement produites et leurs pages calculées par l'assembleur. Il inclut les sous-sections 1.1 à 1.5 de la Partie 1, puis les sous-sections 2.x réellement produites ; il crée une deuxième page seulement si le nombre de rubriques le nécessite. |
| 7 | Introduction : cadre réglementaire | Le texte du modèle de référence est repris, sans reformulation automatique. |
| 8 | Validité, périmètre de mission et réserves | Le texte du modèle de référence est repris, sans le déduire des photographies importées. |
| 9 | Limite de mission et définition des priorités | Le texte et les six catégories du modèle sont repris : Entretien, Signalement, Curatif Niveaux 1 à 3 et Travaux énergétiques. « À confirmer » reste une catégorie de la Partie 2 et n'est pas ajoutée à cette page de Partie 1. |

## Données à saisir une seule fois

- **Projet/rapport** : nom et adresse de la copropriété, dates de visite et de rapport, version choisie parmi « Initiale » et « Finale ».
- **Donneur d'ordre** : nom et adresse du syndic.
- **Équipe** : nom et fonction du chargé de projet, nom et fonction du vérificateur, nom de l'intervenant sur site. Ces valeurs sont saisies en texte libre.
- **Cadastre et bâtiment** : référence cadastrale ; période/année de construction ; date du règlement ; date/numéro d'immatriculation ; nombres de bâtiments, d'entrées, de lots, de niveaux, de lots principaux, de lots d'habitation et d'ascenseurs ; type de chauffage ; SHAB approximative ; altitude.
- **Patrimoine** : état des situations « Aucun périmètre de protection », « Site patrimonial remarquable » et « Abords d'un monument historique ». Ne pas inférer ces états de la seule adresse.
- **Visuels distincts et obligatoires** : photo de couverture, extrait cadastral, vue aérienne rapprochée et vue patrimoniale/large. Les photos de diagnostic de la Partie 2 sont un autre ensemble de fichiers.
- **Dérivés** : phrase de mission, répétition du nom/adresse, pieds de page, numéros de page, total de pages et renvois du sommaire ; les calculer depuis les données centrales et la présentation assemblée.

Tous les champs utilisateur listés ci-dessus, les trois statuts patrimoniaux et les quatre visuels sont obligatoires. La validation centrale de `Part1ReportData` impose cette règle avant la génération ; elle ne peut pas être assouplie par l'interface. Les fonctions du chargé de projet et du vérificateur font explicitement partie de l'équipe et sont obligatoires.

Les coordonnées de France Verte, le logo et les éléments graphiques fixes du modèle ne sont pas des champs à ressaisir pour chaque copropriété. Le générateur utilise `public/france-verte-logo.png` et les éléments fixes extraits du modèle dans `public/part1/`. Les quatre images propres à la copropriété restent obligatoires et ne sont jamais remplacées par les images d'exemple du modèle. Les anciens liens Géoportail/Atlas visibles dans le modèle ne sont pas reproduits comme attribution de cartes importées dont la provenance n'est pas établie.

## Conditions de réalisation future

- Ajouter un modèle de données de rapport séparé de `DiagnosticResult` / `InspectionImageItem`. Une même valeur, par exemple le nom de copropriété, doit alimenter toutes ses occurrences.
- Le contrat mis en place centralise ces valeurs dans `Part1ReportData`. Le nom et l'adresse de la copropriété ne sont stockés qu'une fois ; les textes de mission, pieds de page, numéros et sommaire restent dérivés. Tous les champs utilisateur et les quatre visuels sont obligatoires dans la validation centrale.
- Valider les champs et fichiers de la Partie 1 sans modifier le contrat actuel de l'analyse photo. Un visuel de carte importé ne doit pas partir à `/api/analyze` par simple réutilisation du sélecteur actuel.
- L'interface crée les aperçus des quatre visuels localement et révoque leurs URL objet à leur remplacement ou à sa fermeture. Les fichiers restent dans `Part1ReportData` ; les URL d'aperçu n'y sont jamais stockées.
- Préserver le format A4, l'ordre, les tableaux, les illustrations et les textes modifiables dans le PPT. Les quatre premières diapositives utilisent actuellement une couverture recadrée, et les cartes/extraits contenus dans leurs zones sans recadrage ; ce choix a été comparé visuellement au modèle. `finalize()` ajoute le nombre total de pages et la numérotation lorsque la taille du rapport complet est connue à l'étape d'assemblage.
- Assembler Partie 1 puis Partie 2 dans un seul fichier ; garder le bouton d'export Partie 2 existant fonctionnel jusqu'à validation de l'unification. Réserver un point d'extension simple pour une Partie 3 dont le contenu reste inconnu.
- Les trois pages d'introduction reprennent le texte du modèle `docs/PPPT PART1+PART2 .pptx`, conformément à la décision utilisateur. Ce contenu fixe n'est ni dérivé des photographies ni reformulé automatiquement ; toute évolution devra être demandée explicitement.

## Décisions restantes avant l'automatisation ou l'export

1. Le nom « résidence » et le nom « copropriété » sont-ils toujours identiques ? Les adresses de couverture, de site et de localisation sont-elles une seule donnée ?
2. Les vues cadastrales et satellite devront s'appuyer sur la Géoplateforme nationale (`cartes.gouv.fr`) et ses services WMTS au lieu de l'ancienne infrastructure Géoportail/IGN. La sélection des coordonnées, zooms, compositions, attributions et le traitement d'erreur restent à définir avant toute récupération automatique. Aucun appel externe n'existe actuellement.
3. L'assembleur devra fournir au sommaire les pages réelles de la Partie 2 et les catégories effectivement présentes ; il calculera le total final avant d'appeler `finalize()` sur la couverture et les pages administratives.
4. Le contenu et les documents importés éventuels de la Partie 3 ne sont pas spécifiés. Ne pas créer de champs correspondants à ce stade.
