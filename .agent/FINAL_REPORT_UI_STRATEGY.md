# Interface Partie 3 et export final PPPT — stratégie approuvée

Ce document décrit la stratégie d'interface et d'export du rapport PPPT unifié. Il complète `PART1_REQUIREMENTS.md`, `PART2_BASELINE.md`, `PART3_REQUIREMENTS.md` et `REPORT_ASSEMBLY_PLAN.md` ; il ne modifie ni les contrats métier ni les générateurs existants.

## Statut et objectif

L'application possède trois espaces de travail et un assemblage A4 portrait dans l'ordre Partie 1 → Partie 2 → Partie 3. La saisie Partie 3, ses 17 statuts documentaires, ses deux visuels DPE facultatifs et son générateur existent. L'interface de préparation globale et l'export utilisateur contrôlé du rapport complet sont désormais implémentés ; la revue visuelle dans PowerPoint du fichier téléchargé et le test sur le déploiement public restent requis avant une mise en service considérée comme validée.

Le fichier final attendu reste un unique PPTX, avec sommaire, sous-rubriques, pagination et pieds de page recalculés à partir des diapositives réellement produites. Cette stratégie ne transforme pas l'export autonome Partie 2 en rapport complet.

## 1. Structure générale de l'interface

Conserver les trois espaces existants, sans quatrième onglet ni page d'export séparée :

1. `01 · Informations du rapport` ;
2. `02 · Diagnostics photo` ;
3. `03 · Documentation et synthèse`.

L'espace 03 conclut le parcours. Il héberge la saisie Partie 3, la synthèse de préparation globale et le bouton d'export final contrôlé. Aucun contenu supplémentaire ne doit être ajouté au rapport PowerPoint à cause de cette interface.

## 2. Saisie documentaire Partie 3

Conserver les quatre tableaux de saisie déjà définis et leurs 17 lignes fixes :

| Rubrique | Lignes |
| --- | --- |
| 5.1 Documents réglementaires et administratifs | Assurance de la copropriété ; immatriculation ; fiche synthétique ; règlement de copropriété ; compte bancaire séparé ; procès-verbaux des assemblées générales. |
| 5.2 Diagnostics techniques obligatoires | Dossier Technique Amiante ; CREP des parties communes ; DTG ; termites ; mérules. |
| 5.3 Contrat d'entretien | Maintenance des chaudières collectives inférieures à 400 kW ; supérieures à 400 kW ; carnet d'entretien de l'immeuble. |
| 5.4 Sécurité incendie | Registre de sécurité ; affichage des consignes dans les parties communes ; vérifications périodiques des installations incendie. |

Chaque ligne contient un libellé non modifiable, un statut obligatoire et un commentaire facultatif. Les seules valeurs de statut autorisées sont `Transmis`, `Non transmis` et `Non concerné`. Un commentaire renseigné ne peut pas se limiter à des espaces.

Les tableaux restent la représentation principale : elle correspond au rapport et évite d'introduire des cartes ou formulaires parallèles. Il ne faut pas ajouter de lignes personnalisées, de dates, numéros de document ou pièces jointes hors contrat.

### Couleurs d'aide au statut

La couleur est une aide visuelle discrète : le libellé textuel reste la source de compréhension et doit conserver un contraste suffisant.

| Statut | Couleur de référence |
| --- | --- |
| `Transmis` | Vert France Verte `#00B55A` |
| `Non transmis` | Rouge `#FF0000` |
| `Non concerné` | Gris neutre `#BFBFBF` |

Ces couleurs sont destinées aux puces, bordures légères ou indicateurs de statut. Elles ne doivent pas réduire la lisibilité du texte ni créer un nouveau code couleur dans le PPTX sans validation visuelle.

## 3. Visuels DPE facultatifs

Conserver deux emplacements indépendants :

- Étiquette énergétique — état initial ;
- Étiquette énergétique — scénario de rénovation le plus ambitieux.

Chaque image est facultative, locale à la session, prévisualisable, remplaçable et supprimable. Les seuls formats acceptés sont JPG, PNG et WEBP, dans la limite de 20 Mo. Elles ne sont jamais envoyées à `/api/analyze` ni à Gemini. L'absence d'une ou des deux images ne bloque pas l'export final ; un fichier fourni mais invalide doit être corrigé ou retiré.

## 4. Données à ne pas ressaisir

La Partie 3 ne duplique aucune donnée déjà détenue par une autre partie :

- identité, adresse, dates, version du rapport, syndic et équipe : Partie 1 ;
- photos, priorités, interventions et estimations : Partie 2 ;
- pagination, sommaire, pied de page et total de pages : assemblage ;
- textes fixes, titres et structures du modèle : contenu statique du générateur.

Les exemples présents dans les modèles ne deviennent jamais des valeurs par défaut. Toute valeur hors contrat reste `À confirmer` dans le PPTX.

## 5. Récapitulatif curatif en lecture seule

La zone existante consacrée au Tableau 1 peut afficher un aperçu compact non éditable : nombre de travaux par Curatif Niveau 1, 2 et 3, nombre de montants exploitables et nombre de montants `À confirmer`.

Ce récapitulatif est exclusivement dérivé des diagnostics Partie 2 éligibles, selon `getExportableDiagnostics`, sans mutation ni deuxième état de diagnostic. Il ne conserve que les trois niveaux curatifs. Chaque montant unique correspond à la moyenne arrondie des bornes IA positives, finies et cohérentes ; autrement il vaut `À confirmer`. Les montants restent éditables dans le PPTX pour vérification par un ingénieur, pas dans cette interface.

## 6. Synthèse de préparation globale

Sous le formulaire Partie 3, ajouter un panneau de préparation qui présente trois états :

- Partie 1 : complète ou nombre d'éléments obligatoires manquants ;
- Partie 2 : nombre de diagnostics terminés et à jour prévus à l'export ;
- Partie 3 : statuts renseignés sur 17 et éventuelles erreurs de validation.

Chaque bloc incomplet doit contenir une action de navigation vers l'espace concerné. Les états utilisent une hiérarchie claire : prêt, information facultative, bloquant. Le compteur `17/17` ne suffit pas à lui seul : un commentaire invalide ou une image DPE fournie mais invalide doit aussi apparaître comme un blocage.

Une courte information doit rappeler que les données Partie 1 et Partie 3 restent en mémoire de session. Un rechargement peut les effacer. Ne pas ajouter de persistance locale ou distante sans décision distincte sur la confidentialité et la conservation des fichiers.

## 7. Bouton d'export final

Le bouton final est placé au bas de l'espace 03, après la synthèse globale. Son libellé est : **`Exporter le rapport PPPT complet`**.

Le bouton local `Valider la Partie 3` n'a pas à créer un état validé persistant : la validité est recalculée à partir des données au moment de l'export. Lors de l'implémentation, son rôle est remplacé par la préparation globale et l'action finale.

Le bouton actuel `Exporter tout en PPTX` demeure l'export autonome de la Partie 2. Il reste inchangé tant que le nouvel export n'a pas été validé en conditions réelles. Sa conservation, son renommage ou son retrait ultérieur nécessitent une décision utilisateur séparée.

## 8. Conditions de génération

L'export final doit être bloqué tant que l'une de ces conditions n'est pas satisfaite :

- Partie 1 valide, y compris tous ses champs et ses quatre visuels obligatoires ;
- au moins un diagnostic Partie 2 terminé et à jour ;
- aucune analyse photo ou génération PPTX en cours ;
- les 17 statuts Partie 3 renseignés ;
- les commentaires fournis valides ;
- les images DPE éventuellement fournies valides.

Les commentaires absents, les images DPE absentes, les montants curatifs `À confirmer` et les diagnostics terminés classés `À confirmer` ne bloquent pas le rapport. La priorité `À confirmer` reste exportée en dernier selon la règle Partie 2.

Pour éviter un rapport final qui omettrait silencieusement des photos, la stratégie recommandée est de bloquer le rapport complet si une photo sélectionnée est en attente, en analyse, en erreur ou devenue obsolète. L'utilisateur doit alors l'analyser, l'actualiser ou la retirer. Cette règle concerne seulement le nouveau rapport complet et ne modifie pas l'export autonome de la Partie 2. Elle devra être documentée et testée lors de son implémentation.

## 9. Processus de génération du fichier

Au clic sur le bouton final :

1. prendre un instantané cohérent des données Partie 1, Partie 2 et Partie 3 ;
2. recalculer les validations et l'éligibilité Partie 2 ;
3. charger et préparer les actifs et images requis ;
4. appeler l'assembleur existant Partie 1 → Partie 2 → Partie 3 ;
5. finaliser sommaire, sous-rubriques, pagination, pieds de page et total à partir des diapositives réellement produites ;
6. sérialiser puis normaliser le package Open XML ;
7. déclencher le téléchargement seulement après succès complet.

Pendant la génération, l'interface empêche le double clic, affiche `Création du rapport complet…`, ne simule pas de pourcentage artificiel et ne vide jamais les données. En cas d'erreur, elle conserve le brouillon, explique l'échec et permet une nouvelle tentative. Aucun fichier partiel ne doit être téléchargé.

Le nom de fichier est dérivé des données déjà saisies, avec nettoyage des caractères incompatibles : `PPPT_<copropriete>_<date-rapport>_<Initiale-ou-Finale>.pptx`.

L'export ne déclenche aucun appel Gemini, ne fusionne pas d'archives PPTX déjà écrites et ne modifie pas les résultats Partie 2.

## 10. Architecture recommandée

Conserver des responsabilités ciblées :

- un calcul pur de disponibilité globale P1/P2/P3, testable sans React ;
- un composant de synthèse et d'action finale dans l'espace 03 ;
- un orchestrateur d'export dédié qui charge les actifs, appelle l'assembleur et retourne un `Blob` ;
- l'assembleur existant comme source unique du sommaire, de la pagination et des pieds de page.

`Part3ReportForm` reste concentré sur la saisie documentaire et les visuels DPE. La logique PPTX finale ne doit pas être dispersée dans ce composant ni alourdir `App.tsx`. Le nouvel orchestrateur réutilise les générateurs et le chemin d'assemblage déjà validés ; il ne duplique pas les générateurs et ne modifie pas le contrat ou l'export autonome de la Partie 2.

## Vérifications avant mise en service

Avant d'exposer le bouton final :

1. tester les blocages P1, P2 et P3, les DPE absents ou invalides et les erreurs récupérables ;
2. vérifier l'ordre des priorités, les textes longs, les continuations, les montants `À confirmer`, le sommaire et la pagination ;
3. contrôler l'intégrité Open XML, le format A4 et le téléchargement unique ;
4. rejouer les tests de non-régression de l'export autonome Partie 2 ;
5. exécuter `npm run lint`, `npm test` et `npm run build` ;
6. rendre et inspecter visuellement le fichier effectivement téléchargé, puis le tester en production.

Le contrôle de flux local du 8 octobre 2026 a généré un PPTX depuis l'interface avec Partie 1 complète, un diagnostic simulé et les 17 statuts documentaires. Le fichier contient 36 diapositives A4 avec sommaire, Parties 1, 2 et 3, et a été contrôlé structurellement. Il ne remplace pas une revue de rendu dans PowerPoint avec des données représentatives, ni le test du déploiement public.
