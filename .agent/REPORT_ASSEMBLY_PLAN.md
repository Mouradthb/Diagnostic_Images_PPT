# Rapport PPPT unifié — cible et feuille de route

Ce document fixe la cible du produit et l'ordre d'intégration. Pour l'état exact des composants, lire `PPPT_PROJECT.md` ; pour les invariants de l'export existant, lire `PART2_BASELINE.md` ; pour les entrées et limites déjà cadrées de Partie 3, lire `PART3_REQUIREMENTS.md` ; pour l'organisation de l'interface Partie 3 et l'exposition contrôlée de l'export final, lire `FINAL_REPORT_UI_STRATEGY.md`. Le code et les tests priment si un constat documentaire devient ancien. Cette feuille de route n'autorise aucune modification implicite de la Partie 2 validée.

## Cible confirmée

Le livrable final sera **un seul PPTX A4 portrait** dans l'ordre **Partie 1 → Partie 2 → Partie 3**, avec un sommaire, des données de copropriété et une numérotation cohérents. Les trois parties sont intégrées à l'assemblage. Le bouton d'export unifié est maintenant relié à un pré-contrôle strict ; sa validation de mise en service reste conditionnée par la revue visuelle complète dans PowerPoint et un test du déploiement public.

Le bouton actuel « Exporter tout en PPTX » reste l'**export autonome des diagnostics de la Partie 2**. Il ne doit pas être présenté comme le rapport PPPT complet. Sa conservation après la mise en service du bouton final sera une décision utilisateur distincte.

## État actuel vérifié

| Composant | État |
| --- | --- |
| Partie 1 | Saisie et validation des champs/visuels obligatoires ; générateur de pages administratives, sommaire et introduction disponible. Le sommaire peut être réservé puis finalisé après rendu des autres parties. |
| Partie 2 | Affichage et export autonome fonctionnels, validés par l'utilisateur ; ajout compatible de ses pages à une présentation fournie, sans changement de son export autonome. |
| Partie 3 | Contrat, validation pure, formulaire contrôlé et générateur A4 réalisés. Les 17 statuts obligatoires, commentaires facultatifs, visuels DPE facultatifs et tableau curatif dérivé sont rendus et intégrés à l'assemblage ; les données restent en mémoire de session. |
| Assemblage | L'assembleur de `src/report/` produit une présentation P1→P2→P3, avec sommaire, pied de page et numérotation communs. Sa sérialisation normalise les déclarations Open XML orphelines avant téléchargement. |
| Export final utilisateur | Implémenté derrière `finalReportReadiness` et `finalReportExport` : il bloque les données P1/P3 incomplètes, toute photo P2 non résolue ou obsolète et tout DPE fourni invalide. Le contrôle local du fichier téléchargé est réalisé ; revue PowerPoint et test public restent à faire. |

Les modèles `docs/PPPT PART1+PART2 .pptx` et `docs/PART3.pptx` sont des références de contenu et de présentation, jamais chargées au runtime. Les exemples de données qu'ils contiennent ne sont jamais injectés dans un rapport réel.

## Séquence d'intégration

1. **Contrats et non-régression — réalisés pour P1+P2.** L'assemblage valide `Part1ReportData` avant toute génération et sélectionne les diagnostics via `getExportableDiagnostics`. Les tests vérifient l'ordre, les continuations, les illustrations, le format A4 et le maintien de l'export autonome.
2. **Partie 2 composable — réalisé.** `appendDiagnosticSlides` ajoute les pages à une présentation fournie et retourne les pages de départ des priorités. `renderDiagnosticPptx` et `buildDiagnosticPptx` gardent leurs signatures et passent par ce point interne ; le pied de page et la numérotation reçoivent des valeurs spécifiques au rapport assemblé, avec les anciennes valeurs par défaut pour l'export autonome. Aucune archive PPTX n'est fusionnée. Les années `2027-2028` codées en dur exigent toujours un arbitrage métier explicite, pas une correction silencieuse.
3. **PART1+PART2 assemblées en interne — réalisé, sans bouton utilisateur.** `src/report/part1Part2Assembly.ts` crée une présentation A4, réserve les pages de sommaire, ajoute les deux parties, puis finalise les entrées 1.1 à 1.5, les 2.x réellement présentes, la pagination et le total. Les priorités absentes ne créent pas d'entrée et « À confirmer » reste en dernier. Un PPTX d'essai avec données de test a été généré et inspecté ; les photos réelles et le rendu dans PowerPoint restent à vérifier avant toute diffusion.
4. **Partie 3 — réalisé.** `Part3ReportData` couvre les 17 statuts documentaires requis, leurs commentaires facultatifs et les deux images DPE facultatives. `Part3ReportForm` les collecte, `buildPart3CurativeSummary` lit en lecture seule les diagnostics éligibles et `appendPart3Slides` produit les pages A4, dont le Tableau 1 à montant unique indicatif. Les scénarios énergétiques détaillés, l'annexe Géorisques et les exemples du modèle restent hors contrat de saisie.
5. **Assemblage P1+P2+P3 en interne — réalisé.** L’assembleur consomme `appendPart3Slides`, alimente le sommaire avec ses rubriques/pages réelles, puis recalcule pieds de page, numérotation et total à partir de toutes les diapositives produites. Ce chemin reste testé sans retirer ni modifier l’export autonome de Partie 2.
6. **Contrôler le rapport assemblé — contrôle local du flux réalisé, revue de rendu restante.** L'utilisateur a validé visuellement l'artefact interne courant. Le 8 octobre 2026, le PPTX réellement téléchargé depuis l'interface a été généré avec des données de test et contrôlé : 36 diapositives, A4 portrait, sommaire, Parties 1/2/3, médias et intégrité Open XML. Il reste à le rendre dans PowerPoint et à le comparer avec des données représentatives (tableaux documentaires, captures DPE, continuations curatives, photos réelles et textes hors contrat affichés comme `À confirmer`). Préserver la police, les marges, les espacements, les tableaux éditables et la taille de police du modèle ; ne pas réduire automatiquement la police de façon excessive.
7. **Export final unifié — implémenté, validation de mise en service restante.** Le libellé est « Exporter le rapport PPPT complet ». `finalReportReadiness` est le calcul pur de blocage et `finalReportExport` orchestre l'assembleur existant, sans appel Gemini. Les validations automatisées de préparation et le téléchargement UI sont faits ; le rendu PowerPoint et le comportement sur le déploiement public doivent encore être vérifiés. Le sort du bouton autonome de Partie 2 reste une décision utilisateur distincte.

## Critères de validation

- Les données obligatoires de Partie 1 sont vérifiées au moment de l'export ; des données manquantes bloquent la génération du rapport unifié, sans bloquer l'export autonome de Partie 2.
- Les 17 statuts documentaires Partie 3 sont obligatoires ; leurs commentaires et les deux images DPE sont facultatifs. Le tableau curatif Part3 réutilise les diagnostics Partie 2 éligibles sans les muter et affiche une moyenne arrondie des bornes IA seulement lorsqu'elles sont exploitables ; sinon il affiche « À confirmer ».
- L'ordre des priorités et la sélection des diagnostics restent identiques à la baseline ; aucune catégorie absente n'ajoute de page. Les photos et textes longs restent présents sur les pages de continuation.
- Une seule présentation A4 conserve les textes/tableaux éditables. Couverture, sommaire, sections, pieds de page et numéros reflètent le nombre réel de diapositives, y compris plusieurs pages de sommaire ou d'une fiche.
- Le fichier combiné ne contient aucune déclaration Open XML qui cible une partie absente. La normalisation de package est limitée au chemin d'assemblage interne et au générateur de validation de Partie 3 ; l'export autonome de Partie 2 n'est pas modifié.
- Les champs de copropriété proviennent d'une source unique ; les exemples du modèle et les coûts fictifs ne sont jamais injectés dans un rapport réel.
- Avant toute mise en service : `npm run lint`, `npm test`, `npm run build`, tests d'intégration du fichier unifié et inspection du PPTX rendu. Pour toute modification de la Partie 2, vérifier en plus son export autonome et consigner l'impact.

Les vues cartographiques automatiques via Géoplateforme/WMTS constituent un chantier séparé. Elles ne doivent pas être nécessaires à l'assemblage initial : les quatre visuels de Partie 1 restent actuellement importés et obligatoires.
