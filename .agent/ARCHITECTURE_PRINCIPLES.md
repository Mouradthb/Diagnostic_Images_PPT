# Principes d'architecture pour les prochaines parties PPPT

Ces principes guident les évolutions futures. Ils n'imposent pas de réécrire le code actuel. Le comportement attesté est décrit dans `PART2_BASELINE.md` ; la future Partie 1 dans `PART1_REQUIREMENTS.md`.

> Une architecture simple qui fonctionne est préférable à une architecture théoriquement parfaite mais difficile à maintenir.

## Priorités

1. Fiabilité et non-régression des comportements validés.
2. Lisibilité et responsabilité claire des modules.
3. Tests utiles sur les contrats et les sorties observables.
4. Faible couplage, forte cohésion et réutilisation de ce qui est réellement commun.
5. Compatibilité des appels existants pendant une intégration progressive.

## DRY et source unique de vérité

Une donnée saisie pour une copropriété doit être stockée une fois puis réutilisée sur la couverture, les informations administratives, les pieds de page et les parties suivantes. Les priorités autorisées et leur ordre ont déjà une source partagée : `api/_lib/diagnosticContract.ts`. Avant d'ajouter un autre mapping, vérifier s'il exprime la même règle ou une présentation propre à un support.

Regrouper une règle métier ou une transformation seulement lorsqu'au moins deux consommateurs en ont réellement besoin et que son contrat est clair. Éviter la duplication des validations, coûts, traitements d'images et libellés ; éviter également de créer un service générique pour une seule utilisation.

## SOLID appliqué au code présent

- **Responsabilité unique** : garder distincts données du rapport, validation, analyse photo, construction des pages et téléchargement. `App.tsx` et `pptxExport.ts` ont plusieurs responsabilités ; les séparer progressivement seulement si une fonctionnalité le justifie et si les tests protègent les sorties.
- **Ouvert à l'extension** : prévoir que les Parties 1 et 3 s'ajoutent à la présentation sans refaire la logique métier de tri et de rendu de la Partie 2. Une fonction d'assemblage peut composer des générateurs ciblés quand ils existent réellement.
- **Substitution** : si un contrat de générateur commun devient utile, chaque implémentation doit respecter les mêmes hypothèses d'entrée, de pagination et de gestion d'erreur. Ne pas créer une hiérarchie artificielle pour ce seul principe.
- **Interfaces ciblées** : une Partie 1 ne doit pas dépendre de `InspectionImageItem` si elle n'en a pas besoin ; la Partie 2 ne doit pas exiger les champs administratifs pour continuer son export autonome.
- **Dépendances maîtrisées** : isoler autant que raisonnable les règles métier des détails `pptxgenjs`, `canvas` ou `fetch`, sans couche d'abstraction supplémentaire qui n'apporte aucune protection concrète.

## Données, images et assemblage

- Le futur modèle de projet/rapport doit être distinct de `DiagnosticResult` et relié aux parties par des contrats explicites. Une localisation déclarée par l'utilisateur et un périmètre inféré par l'analyse restent deux données différentes.
- Pour les visuels de Partie 1, distinguer import, validation, conservation temporaire, préparation et insertion. Définir les règles de durée et de réimport avant d'ajouter une persistance ; le cache actuel ne stocke aucune photo.
- La pagination et le sommaire d'un rapport unifié doivent provenir des diapositives effectivement assemblées. Centraliser les dimensions A4, la numérotation globale, les pieds de page et les coordonnées communes seulement lorsque l'assemblage est implémenté.
- Conserver les tableaux et textes éditables. Comparer les sorties avec `docs/PPPT PART1+PART2 .pptx` ; ce fichier est une référence, pas un moteur de génération actuellement chargé.

## Compatibilité et vérification

Avant de toucher la Partie 2, recenser les consommateurs de `DiagnosticResult`, `getExportableDiagnostics`, `renderDiagnosticPptx` et `buildDiagnosticPptx`, puis les tests associés. Préférer un ajout compatible à une rupture des signatures utilisées par l'interface et les tests. Tester la propriété qui risque réellement de régresser : ordre, filtrage, contenu, continuité des pages, emplacement des images ou numérotation. Pour une modification visuelle, une inspection du fichier PowerPoint rendu complète les assertions XML.

Les opportunités actuelles, non implémentées, sont : partager la présentation des coûts entre écran et PPT ; mieux centraliser les métadonnées de priorité ; réduire la duplication des contrôles de `DiagnosticResult` entre serveur et cache ; extraire l'orchestration d'export de `App` si le rapport unifié la complexifie ; rendre paramétrables les valeurs figées du pied de page. Chacune doit rester une décision locale fondée sur un besoin de la nouvelle partie et son coût de migration.
