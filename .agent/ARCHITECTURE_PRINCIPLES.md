# Principes d'architecture pour les prochaines parties PPPT

Ces principes guident les évolutions futures. Ils n'imposent pas de réécrire le code actuel. Le comportement attesté de la Partie 2 est décrit dans `PART2_BASELINE.md` ; la Partie 1 préparée dans `PART1_REQUIREMENTS.md` ; le contrat cadré de Partie 3 dans `PART3_REQUIREMENTS.md` ; l'objectif et les étapes de l'assemblage dans `REPORT_ASSEMBLY_PLAN.md`.

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
- **Ouvert à l'extension** : l'assembleur interne compose désormais les Parties 1, 2 et 3 sans refaire la logique métier de tri et de rendu de la Partie 2. La Partie 3 garde son contrat isolé et `appendPart3Slides` s'y raccorde sans modifier le générateur Partie 2.
- **Substitution** : si un contrat de générateur commun devient utile, chaque implémentation doit respecter les mêmes hypothèses d'entrée, de pagination et de gestion d'erreur. Ne pas créer une hiérarchie artificielle pour ce seul principe.
- **Interfaces ciblées** : une Partie 1 ne doit pas dépendre de `InspectionImageItem` si elle n'en a pas besoin ; la Partie 2 ne doit pas exiger les champs administratifs pour continuer son export autonome.
- **Dépendances maîtrisées** : isoler autant que raisonnable les règles métier des détails `pptxgenjs`, `canvas` ou `fetch`, sans couche d'abstraction supplémentaire qui n'apporte aucune protection concrète.

## Données, images et assemblage

- Le futur modèle de projet/rapport doit être distinct de `DiagnosticResult` et relié aux parties par des contrats explicites. Une localisation déclarée par l'utilisateur et un périmètre inféré par l'analyse restent deux données différentes.
- Pour les visuels de Partie 1, distinguer import, validation, conservation temporaire, préparation et insertion. Définir les règles de durée et de réimport avant d'ajouter une persistance ; le cache actuel ne stocke aucune photo.
- Les deux visuels DPE de Partie 3 sont facultatifs, locaux à la session et validés séparément. Ils ne sont pas des photos d'analyse et ne doivent jamais être envoyés à Gemini par réutilisation d'un flux existant.
- La pagination et le sommaire du rapport assemblé interne proviennent des diapositives effectivement produites, y compris les continuations et les pages de sommaire. Les dimensions A4, la numérotation globale, les pieds de page et les coordonnées communes sont centralisés par l'assemblage ; toute évolution doit préserver l'export autonome de Partie 2.
- La Partie 2 peut désormais ajouter ses pages à une présentation commune via `appendDiagnosticSlides`, tandis que son export autonome conserve le `Blob` et ses signatures. Ne pas fusionner d'archives PPTX sérialisées ; analyser et tester tout nouveau changement de son générateur.
- La composition Partie 1 → Partie 2 → Partie 3 est la source unique du rapport unifié. Le bouton final passe par le pré-contrôle pur et l'orchestrateur dédiés ; sa mise en service reste subordonnée à l'inspection visuelle complète dans PowerPoint et à la validation utilisateur. Ne pas ajouter de champs hors du contrat attesté ni injecter les exemples du modèle.
- Le tableau curatif Partie 3 consomme les diagnostics éligibles via `getExportableDiagnostics`, filtre les trois niveaux curatifs et ne mute jamais ces diagnostics. Son montant unique est une transformation d'affichage, pas une nouvelle estimation métier.
- Conserver les tableaux et textes éditables. Comparer les sorties avec `docs/PPPT PART1+PART2 .pptx` ; ce fichier est une référence, pas un moteur de génération actuellement chargé.

## Compatibilité et vérification

Avant de toucher la Partie 2, recenser les consommateurs de `DiagnosticResult`, `getExportableDiagnostics`, `renderDiagnosticPptx` et `buildDiagnosticPptx`, puis les tests associés. Préférer un ajout compatible à une rupture des signatures utilisées par l'interface et les tests. Tester la propriété qui risque réellement de régresser : ordre, filtrage, contenu, continuité des pages, emplacement des images ou numérotation. Pour une modification visuelle, une inspection du fichier PowerPoint rendu complète les assertions XML.

Les opportunités actuelles, non implémentées, sont : partager la présentation des coûts entre écran et PPT ; mieux centraliser les métadonnées de priorité ; réduire la duplication des contrôles de `DiagnosticResult` entre serveur et cache. L'orchestration du rapport unifié est désormais extraite de `App` dans `finalReportReadiness.ts` et `finalReportExport.ts`. Le pied de page Partie 2 est paramétrable pour l'assemblage, avec les anciennes valeurs conservées par défaut. Chaque autre évolution doit rester une décision locale fondée sur un besoin de la nouvelle partie et son coût de migration.
