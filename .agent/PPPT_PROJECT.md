# PPPT — vue d'ensemble du projet

État relevé le 2 octobre 2026 sur `main` (`b9a1433`). Ce document décrit le code présent, puis la direction souhaitée. Une validation utilisateur de l'export Partie 2 ne vaut pas validation technique ou métier d'un PPPT complet.

## Produit et état actuel

L'application « Diagnostic Technique Bâtiment » est une interface React 19 / Vite 6 / TypeScript. Un membre autorisé importe des photos JPG, PNG ou WEBP, précise éventuellement leur localisation, lance une pré-analyse Gemini photo par photo, consulte les fiches classées par priorité et exporte les diagnostics terminés en PPTX A4 portrait. L'analyse photographique reste indicative ; le code ne génère pas encore un rapport PPPT complet.

- **Partie 1 préparée pour l'assemblage** : le contrat central isolé est dans `src/part1/reportData.ts`, sa validation dans `src/part1/reportDataValidation.ts` et le formulaire contrôlé dans `src/part1/Part1ReportForm.tsx`. L'utilisateur peut renseigner les données, les trois statuts patrimoniaux et les quatre visuels depuis « 01 · Informations du rapport ». `src/part1/part1Pptx.ts` construit les quatre pages administratives, un sommaire alimenté par les rubriques/pages effectives et trois pages d'introduction. Le bouton d'export unifié et l'assemblage ne sont pas encore implémentés. Voir `PART1_REQUIREMENTS.md`.
- **Partie 2 existante et validée** : fiches de diagnostic classées, colorées et illustrées, exportées par `src/utils/pptxExport.ts`. Voir `PART2_BASELINE.md`.
- **Partie 3 future** : contenu et interface à confirmer ; aucun module correspondant dans le dépôt.
- **Cible** : un seul `.pptx` dans l'ordre Partie 1 → Partie 2 → Partie 3, avec données communes, sommaire et numérotation cohérents. L'assemblage unifié n'existe pas encore.

## Architecture effectivement présente

| Zone | Fichiers et rôle observés |
| --- | --- |
| Démarrage et accès | `src/main.tsx` monte `AuthGate` ; `src/firebase.ts` configure Firebase client ; `src/components/AuthGate.tsx` gère la connexion Google et vérifie `/api/me`. |
| Interface et orchestration | `src/App.tsx` tient la liste `InspectionImageItem`, importe et prépare les photos, appelle `/api/analyze`, gère lot/réessai/annulation, cache, filtres et téléchargement PPTX. |
| Présentation des diagnostics | `src/components/LegendBar.tsx` affiche la grille et ses compteurs ; `src/components/ResultCard.tsx` affiche la fiche/tableau ; `src/index.css` porte la mise en forme. |
| Contrat partagé | `api/_lib/diagnosticContract.ts` définit les priorités et énumérations ; `src/types.ts` les réexporte et définit `DiagnosticResult` / `InspectionImageItem`. |
| API et modèle | `api/me.ts`, `api/analyze.ts` sont les points d'entrée Vercel ; `api/_lib/auth.ts` vérifie Firebase et choisit la clé par UID ; `api/_lib/analyze.ts` valide photo/résultat, appelle `@google/genai` ; `api/_lib/prompt.ts` contient la consigne. |
| Fiabilité locale | `src/utils/analysisControl.ts` cadence et borne les reprises ; `analysisRetry.ts` gère états et résultats périmés ; `diagnosticCache.ts` conserve des résultats validés ; `fileHelpers.ts` compresse les photos pour l'API ; `resultFilter.ts` filtre l'affichage. |
| Export Partie 2 | `src/utils/pptxExport.ts` sélectionne les résultats, prépare les photos, dessine les diapositives avec `pptxgenjs` et renvoie un `Blob`. `src/App.tsx` déclenche le téléchargement. |
| Générateur Partie 1 | `src/part1/part1Pptx.ts` prépare les quatre visuels et actifs fixes, valide les entrées, ajoute les pages administratives, le sommaire et l'introduction à une présentation `pptxgenjs`. Il reste isolé de l'export existant. |
| Développement/déploiement | `dev-server.ts` fournit Express + Vite en local et réutilise la logique de l'API ; `vite.config.ts` configure le build et l'empreinte du contrat pour le cache ; `api/` sert aux fonctions Vercel. |

Flux actuel : connexion Google → autorisation `/api/me` → import photo et localisation → compression dans le navigateur → `/api/analyze` authentifié → validation et appel Gemini côté serveur → `DiagnosticResult` → état/cache local et `ResultCard` → export côté navigateur depuis les fichiers encore présents. Le filtre de lecture ne réduit pas l'export.

## Données et contraintes constatées

- Les photos et leurs URL de prévisualisation vivent dans l'état du navigateur. `diagnosticCache.ts` stocke seulement les résultats, par UID, empreinte SHA-256 du fichier, localisation et version du prompt/contrat/modèles, pendant 24 h et au plus 200 entrées. Après rechargement, les fichiers doivent être réimportés pour être illustrés/exportés.
- Le client accepte des fichiers jusqu'à 20 Mo, prépare la requête sous 4 Mo ; le serveur valide taille, type et signature avant Gemini. Le serveur valide aussi la réponse JSON et sa cohérence avant renvoi.
- Le code local et Vercel partagent `api/_lib/analyze.ts` et `api/_lib/auth.ts`. `@google/genai`, Firebase/Firebase Admin et `pptxgenjs` sont les dépendances majeures de ce flux. Il n'y a ni base de données métier ni stockage de rapport sur le serveur.
- Les limites, délais et comportements de secours sont documentés dans `README.md` et testés dans `tests/analysisControl.test.ts`, `tests/analysisRetry.test.ts` et `tests/security.test.ts`.

## Références documentaires et divergence à retenir

- `docs/PPPT_donnees_entree_a_confirmer.md` inventorie les champs sur la base d'un **ancien PPT de 9 diapositives** nommé dans ce texte. Ne pas réécrire ses données métier sans nécessité.
- Le modèle désormais disponible, `docs/PPPT PART1+PART2 .pptx`, contient **21 diapositives** de **7559675 × 10691813 EMU**, soit A4 portrait. Les diapositives 1–9 couvrent la future Partie 1 ; la section 2 démarre à la 10 et continue jusqu'à la 21. Le sommaire du modèle annonce aussi des sections ultérieures qui ne sont pas présentes dans ce fichier.
- Les générateurs ne chargent pas ce PPTX comme fichier de sortie. Ils reconstruisent la Partie 2 et les pages de la Partie 1 avec `pptxgenjs`. Le modèle sert à comparer contenu et aspect ; certains éléments graphiques fixes en ont été extraits. Les différences entre modèle et export Partie 2 actuel ne sont pas des modifications à appliquer automatiquement à une baseline acceptée.

## Évolution raisonnable, non implémentée

Le modèle central des données du projet/rapport est distinct des résultats par photo. L'interface Partie 1 alimente ce modèle et gère ses visuels séparément des photos de diagnostic. La génération de ses pages est prête ; l'étape suivante est l'assemblage avec la Partie 2 dans une seule présentation A4. Garder le point d'entrée actuel de l'export Partie 2 pendant l'intégration. Calculer les numéros globaux, le total de pages et les entrées du sommaire à partir des diapositives réellement produites. Ajouter la Partie 3 lorsque son périmètre sera fourni.

Règles confirmées : tous les champs utilisateur, les trois statuts patrimoniaux et les quatre visuels de Partie 1 sont obligatoires ; « Votre situation » est seulement le titre de la zone des trois listes déroulantes patrimoniales ; les noms et fonctions de l'équipe sont saisis librement ; la version est limitée à « Initiale » ou « Finale ». Les trois pages d'introduction de Partie 1 reprennent le texte fixe du modèle, sans reformulation automatique. Le sommaire prévoit les sous-sections 1.1 à 1.5 et recevra les sous-sections 2.x réellement produites par l'assembleur, sans coupler la Partie 1 à l'export autonome de Partie 2. Les cartes devront à terme provenir de la Géoplateforme nationale via WMTS, sans récupération automatique implémentée à ce stade. Restent à confirmer : modalités de saisie/stockage des données de projet, paramètres opérationnels des cartes et contenu précis de la Partie 3.
