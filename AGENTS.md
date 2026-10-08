# Règles permanentes du projet PPPT

Ce fichier concerne le dépôt `Diagnostic_Images_PPT_app`. Lire aussi `.agent/PPPT_PROJECT.md`, `.agent/PART2_BASELINE.md`, `.agent/PART3_REQUIREMENTS.md`, `.agent/ARCHITECTURE_PRINCIPLES.md` et `.agent/REPORT_ASSEMBLY_PLAN.md` avant une évolution du rapport. Le code et les tests présents priment sur une description documentaire devenue ancienne ; corriger alors la documentation dans la même intervention.

## État à protéger

- La Partie 2, « Identification et hiérarchisation des travaux et observations », existe, fonctionne et a été validée par l'utilisateur. Son export autonome est dans `src/utils/pptxExport.ts` et ses tests dans `tests/pptxExport.test.ts`.
- Ne pas réécrire la Partie 2, modifier ses entrées/sorties, son ordre de priorité, ses règles d'éligibilité, ses illustrations, sa pagination ou ses tableaux sans demande explicite et analyse d'impact.
- Une refactorisation esthétique ne justifie pas un risque de régression. L'assemblage interne Partie 1 → Partie 2 → Partie 3 est réservé aux tests et à la validation ; conserver l'export autonome de Partie 2 jusqu'à validation visuelle complète du rapport unifié et décision explicite d'exposer son export.
- La cible est un seul PPTX Partie 1 → Partie 2 → Partie 3. L'export utilisateur unifié doit passer exclusivement par un pré-contrôle pur, l'orchestrateur dédié et l'assembleur existant ; il ne doit jamais contourner les validations P1/P2/P3. Toute mise en service demeure conditionnée aux contrôles automatisés, à l'inspection visuelle complète dans PowerPoint et à la validation utilisateur.
- Préserver les autres comportements existants : authentification, contrat de diagnostic, limitation/réessai des appels, cache de 24 h, affichage des résultats et export PPTX. Ne jamais introduire de clé Gemini dans le navigateur ou le dépôt.

## Méthode avant un changement fonctionnel

1. Lire `git status`, identifier les changements préexistants et ne pas les écraser.
2. Lire les fichiers réellement concernés et tracer le flux de l'interface à l'API, au modèle de données et à l'export ; consigner l'impact sur la Partie 2 si elle est touchée directement ou indirectement.
3. Établir le comportement observable à préserver et consulter les tests correspondants. Ajouter un test de non-régression lorsqu'un risque concret apparaît.
4. Faire le plus petit changement cohérent. Garder l'ancien chemin d'export utilisable pendant l'intégration du rapport unifié, sauf demande contraire.
5. Vérifier selon le risque avec `npm run lint`, `npm test` et `npm run build`, puis ouvrir/render le PPTX lorsqu'une mise en page ou une pagination change.
6. Expliquer les écarts constatés et mettre à jour les documents de `.agent/` si l'architecture ou la baseline a effectivement changé.

## Principes d'architecture

- Partager une donnée métier saisie une seule fois entre les diapositives et les parties du rapport. Ne pas créer plusieurs états indépendants pour le nom ou l'adresse de la copropriété.
- Séparer, lorsque cela simplifie le code, collecte, validation, transformation, traitement des images, génération des parties et assemblage PPTX.
- Mutualiser seulement les règles réellement communes (DRY). Appliquer SOLID avec pragmatisme ; éviter les hiérarchies, services et abstractions prématurés.
- Conserver des contrats ciblés et compatibles avec les consommateurs existants. Toute modification du contrat `DiagnosticResult` exige l'examen du prompt, du schéma serveur, du cache, de l'interface et du PPTX.
- Préserver le format A4 portrait et les éléments modifiables du PPT. `docs/PPPT PART1+PART2 .pptx` est une référence de contenu et de présentation, pas un fichier actuellement chargé par le code.
- Ne pas copier les exemples de copropriété ou de coûts du modèle dans un rapport réel comme s'ils étaient les données du projet courant. Les points non établis restent « À confirmer ».

## Références et limites actuelles

- `.agent/PART1_REQUIREMENTS.md` décrit la Partie 1 intégrée, `.agent/PART3_REQUIREMENTS.md` le contrat et le générateur de Partie 3, et `.agent/REPORT_ASSEMBLY_PLAN.md` est la feuille de route de la validation du rapport assemblé puis de l'éventuel export final.
- `docs/PPPT_donnees_entree_a_confirmer.md` est l'inventaire métier fourni ; conserver son contenu. Il décrit un ancien fichier de **9** diapositives. Le modèle actuellement présent dans `docs/PPPT PART1+PART2 .pptx` en contient **21** (Partie 1 : 1 à 9 ; Partie 2 de référence : 10 à 21). Les documents doivent signaler cet écart.
- La Partie 3 possède désormais un contrat limité à 17 statuts documentaires obligatoires, commentaires facultatifs, deux visuels DPE facultatifs et un récapitulatif curatif dérivé en lecture seule de la Partie 2. Sa saisie contrôlée, son générateur A4, son intégration à l'assemblage et l'export unifié sous garde-fous existent ; la validation visuelle complète dans PowerPoint et le test de production restent requis. Ne pas inventer d'autres champs ni recopier les exemples du modèle.
