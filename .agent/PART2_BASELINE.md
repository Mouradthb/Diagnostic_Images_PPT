# Partie 2 — baseline fonctionnelle actuelle

Relevé sur `main` au commit `b9a1433` le 2 octobre 2026. L'utilisateur a confirmé le fonctionnement de l'export Partie 2. Ce document décrit les comportements visibles dans le code et les tests ; il ne transforme pas cette pré-analyse photo en PPPT réglementaire complet.

Cette référence historique reste la baseline à protéger pendant l'intégration du rapport. La cible et l'ordre des travaux sont décrits dans `REPORT_ASSEMBLY_PLAN.md` : les Parties 1, 2 et 3 sont désormais assemblées et l'export final contrôlé est exposé dans l'espace 03. Le bouton décrit ci-dessous reste un export autonome de Partie 2. La Partie 3 lit déjà `getExportableDiagnostics` en lecture seule pour son tableau curatif ; cette relation ne modifie ni la sélection, ni l'ordre, ni le rendu de la Partie 2.

## Fonction, entrées et sortie

La Partie 2 affiche une fiche par photo analysée et peut exporter un PPTX A4 portrait composé des diagnostics terminés et à jour. L'interface affiche les résultats sous forme de tableau dans `ResultCard`. Le bouton « Exporter tout en PPTX » dans `App` lance l'export autonome dans le navigateur.

L'entrée de l'export est `readonly InspectionImageItem[]` (`src/types.ts`) : chaque élément contient le `File` photo original, sa localisation déclarée, son statut et éventuellement un `DiagnosticResult` avec priorité, famille, localisation décrite, observations, intervention, coûts min/max et confiance. Les données sont issues de `/api/analyze` ou d'un cache local validé. La sortie de `buildDiagnosticPptx` / `renderDiagnosticPptx` est un `Blob` PPTX ; `App` le télécharge sous `Diagnostics_France_Verte_YYYY-MM-DD.pptx`.

L'export ne refait aucun appel Gemini. Le filtre de priorité de l'interface n'entre pas dans `buildDiagnosticPptx` : toutes les fiches éligibles sont exportées.

## Fichiers et responsabilités réels

| Fichier | Responsabilité dans le flux |
| --- | --- |
| `src/App.tsx` | Conserve `items`, importe les fichiers, fait l'analyse, calcule `exportableCount`, importe dynamiquement `pptxExport.ts` et déclenche le téléchargement. |
| `src/types.ts` et `api/_lib/diagnosticContract.ts` | Définissent `InspectionImageItem`, `DiagnosticResult` et l'ordre canonique `DIAGNOSTIC_NIVEAUX`. |
| `src/components/ResultCard.tsx` | Affiche famille/priorité, localisation, observations, recommandations ou travaux, chiffrage conditionnel, illustration. |
| `src/components/LegendBar.tsx`, `src/utils/resultFilter.ts`, `src/utils/fileHelpers.ts`, `src/index.css` | Comptes/filtres/étiquettes/couleurs de l'interface. |
| `src/utils/analysisRetry.ts` | `isResultOutdated` compare la localisation courante à celle du résultat analysé. |
| `src/utils/diagnosticCache.ts` | Réutilise un résultat valide pendant 24 h ; le cache ne conserve pas la photo. |
| `api/_lib/prompt.ts`, `api/_lib/analyze.ts` | Consigne, schéma et validation des champs fournis par Gemini. |
| `src/utils/pptxExport.ts` | Sélectionne, ordonne, met en page et encode la présentation. |
| `public/france-verte-logo.png` | Logo chargé par le navigateur pour chaque diapositive exportée. |
| `tests/pptxExport.test.ts` | Tests directs du tri et du PPTX généré. |

## Fonctions importantes et chemin des données

`App.handleAddFiles` crée les `InspectionImageItem` avec `File` et `previewUrl`. `App.analyzeItem` cherche d'abord un résultat en cache, sinon prépare l'image avec `prepareImageForAnalysis`, puis `requestAnalysis` envoie un appel authentifié à `/api/analyze`. `api/_lib/analyze.ts` valide la photo, demande un JSON à Gemini et valide le résultat. `App.processItems` attache ce résultat à l'élément et note la localisation analysée. `ResultCard` l'affiche.

Pour l'export, `App.handleExportPptx` charge `buildDiagnosticPptx(items)` à la demande. Cette fonction vérifie l'éligibilité, récupère `/france-verte-logo.png`, le convertit en data URL et appelle `renderDiagnosticPptx(items, logoData, preparePhoto)`. Le rendu crée les diapositives avec `pptxgenjs` et renvoie le `Blob`.

`getExportableDiagnostics` garde uniquement `status === 'completed'`, avec résultat présent et `!isResultOutdated(item)`. Il trie selon `DIAGNOSTIC_NIVEAUX` en préservant l'ordre d'import dans une même priorité : **Entretien → Signalement hors PPPT à vérifier → Curatif Niveau 1 → Curatif Niveau 2 → Curatif Niveau 3 → Travaux énergétiques → À confirmer / expertise nécessaire**. Les catégories absentes ne produisent aucune diapositive. « À confirmer » est placé en dernier ; le code ne propose pas de reclassement interactif dans PowerPoint.

Pour l'assemblage interne, `appendDiagnosticSlides` réutilise exactement cette sélection et ce rendu dans une présentation fournie. Il retourne les pages de départ de chaque priorité présente. Le nom de copropriété et le numéro de première page peuvent être fournis par l'assembleur ; sans options, le pied de page et la numérotation historiques de l'export autonome sont conservés. `renderDiagnosticPptx` et `buildDiagnosticPptx` gardent leurs signatures et leur sortie `Blob`.

## Présentation produite actuellement

- `renderDiagnosticPptx` instancie une présentation `pptxgenjs` et définit A4 portrait à **7559675 × 10691813 EMU**. Polices, couleurs, tableau et positions sont codés dans `pptxExport.ts` ; le texte et les formes restent des objets PowerPoint modifiables.
- `addPageHeader` place le logo, le titre de section 2, l'en-tête N°/Famille/priorité. Le chevron coloré et le texte explicatif de priorité ne s'affichent que sur la première diapositive de chaque catégorie présente, y compris lorsqu'une fiche continue sur une autre page. Le tableau démarre plus haut sur les pages sans introduction de priorité.
- `addBodyRow` dessine Localisation, État / Observations et Recommandations pour Entretien/Signalement, ou Travaux à effectuer pour les autres. `addCostRow` ajoute le chiffrage aux autres priorités : fourchette TTC si le minimum est positif, sinon « À déterminer après visite et définition des travaux ». Une estimation chiffrée porte la mention « Estimation IA indicative » sans attribution à Bati Chiffrage.
- `addIllustration` ajoute la photo dans une ligne Illustration pour **toutes** les priorités. `preparePhoto` décode le `File`, réduit le côté maximal à 2200 px, dessine sur fond blanc et encode en JPEG qualité 0,88. Les images sont intégrées au PPTX.
- `wrapLines` / `measureLine` calculent les lignes et la place disponible. Un long champ est scindé avec « (suite) » sur de nouvelles diapositives ; une place insuffisante avant le coût ou l'image crée aussi une continuation. Le pied de page et le numéro sont ajoutés après la création des diapositives.
- Actuellement le pied de page contient le texte **figé** `Copropriété ABCD XYZ` et la numérotation repart à 1 pour l'export autonome. `N°` est le rang global des diagnostics exportés, non un compteur remis à 1 par priorité. La première ligne du titre de section est également figée. Ces faits restent à préserver dans l'export autonome et sont paramétrés par l'assemblage interne.

## Modèle PPT de référence et dépendances

`docs/PPPT PART1+PART2 .pptx` contient 21 diapositives A4 portrait, dont la Partie 2 de référence va de la diapositive 10 à la 21. Le code **n'importe pas** ce fichier et ne duplique pas ses diapositives : il dessine sa propre version de la Partie 2 en `pptxgenjs` 4.0.1. Le modèle sert à une comparaison visuelle et métier. Il comporte des exemples et des rubriques qui ne doivent pas être attribués automatiquement à de nouvelles photos.

Écarts visibles dans le PPT de référence : la diapositive 14 porte « Signalement » mais son texte d'introduction reprend la définition de l'Entretien ; la diapositive 20 est une fiche « Travaux énergétiques » avec plusieurs valeurs laissées vides, suivie d'une fiche renseignée en diapositive 21. Ces points sont à arbitrer avant de reproduire les diapositives, sans changer la Partie 2 validée pour les corriger implicitement. Le modèle remet par ailleurs certains numéros `N°` à 1 par rubrique, tandis que l'export actuel numérote globalement les diagnostics.

L'analyse dépend de `@google/genai` côté serveur, de Firebase/Firebase Admin pour l'accès et de l'API locale/Vercel. L'export lui-même utilise `pptxgenjs`, les API navigateur (`fetch`, `FileReader`, `createImageBitmap`, `canvas`, `Blob`, téléchargement par URL objet) et le logo public. Les tests lisent l'archive PPTX via `jszip`.

## Tests présents et limites de couverture

`tests/pptxExport.test.ts` couvre : ordre strict et stable ; exclusion des éléments incomplets/périmés ; dimensions A4 et texte éditable ; champs selon priorité, coûts indicatifs et illustrations ; chevron/description une seule fois par catégorie ; continuation d'un texte long. `tests/resultFilter.test.ts` couvre des comportements d'affichage, dont étiquettes/couleurs et absence des métadonnées inutiles dans l'en-tête des fiches. `tests/security.test.ts` vérifie des contraintes du contrat de résultat ; les autres tests protègent cache et reprise.

À ce jour, les tests PPTX chargent le véritable logo public mais substituent ce même visuel aux photos de diagnostic ; ils inspectent surtout le XML. Ils ne prouvent pas, à eux seuls, la qualité visuelle dans PowerPoint, la fidélité pixel à pixel au modèle, tous les ratios de photo, les extrêmes de longueur ni le rendu d'un rapport unifié. Le test d'assemblage interne Partie 1 → Partie 2 → Partie 3 vérifie les pages, le sommaire, les pieds de page et les priorités ; il ne remplace pas un contrôle avec des photos réelles dans PowerPoint.

Vérification historique de l'état documentaire du 2 octobre 2026 : `tsc --noEmit` réussi, **67 tests réussis** et build Vite réussi. Ce nombre ne désigne pas la taille actuelle de la suite. Aucun essai sur des données Gemini réelles ni inspection manuelle d'un nouveau PPTX n'a été effectué pour cette tâche de documentation.

## Invariants à préserver et zones fragiles

Préserver l'ordre des sept priorités, le maintien de l'ordre d'import dans chaque priorité, l'exclusion des diagnostics non terminés ou à actualiser, l'absence de nouvel appel IA lors de l'export, le chiffrage absent d'Entretien/Signalement, l'illustration pour tous, la couleur/étiquette propre à chaque priorité, l'introduction unique par catégorie, la continuation des textes et le téléchargement PPTX A4 avec texte modifiable.

Points de vigilance :

1. `renderDiagnosticPptx` crée et numérote aujourd'hui toute la présentation ; l'insérer dans un autre deck sans adapter ce contrat peut doubler les pieds de page ou produire une numérotation incorrecte.
2. Le nom de copropriété et le titre de section sont figés. La Partie 1 nécessitera des données de rapport partagées sans remplacer par erreur des exemples du modèle.
3. `App` concentre interface, appels, cache et export. Un changement d'état ou de sélection peut modifier indirectement l'éligibilité de l'export.
4. `ResultCard`, `LegendBar`, `fileHelpers.ts` et `pptxExport.ts` portent des libellés/couleurs/présentations connexes dans des endroits différents ; une future correction métier peut diverger entre écran et fichier.
5. Les images ne persistent pas avec les résultats. L'export après rechargement suppose la réimportation des fichiers ; ajouter d'autres visuels à la Partie 1 impose un cycle de vie explicite.
6. Les mesures de texte reposent sur `canvas` ou une estimation de secours. Les textes longs et polices de l'environnement PowerPoint restent à vérifier visuellement après tout changement de mise en page.
7. Les règles d'estimation et de cohérence du contrat sont proches dans `api/_lib/analyze.ts` et `diagnosticCache.ts` ; toute évolution doit maintenir la validation des données conservées.
8. Les années `2027-2028` dans la description de Curatif Niveau 1 sont codées en dur dans `PRIORITY_COLORS`. Elles ne sont pas calculées depuis la date du rapport et exigent un arbitrage métier explicite avant toute mise à disposition d'un rapport unifié daté.
