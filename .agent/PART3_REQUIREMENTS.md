# Partie 3 — contrat de données, formulaire et générateur

Ce document décrit le périmètre actuellement implémenté pour la Partie 3 du rapport PPPT. Le formulaire et le générateur de diapositives participent à l'assemblage P1→P2→P3 ; le panneau de préparation de l'espace 03 expose l'export final sous contrôle de validité. Sa revue visuelle PowerPoint et son test de déploiement public restent à faire.

Les sources de comparaison métier et visuelle sont les fichiers fournis par l'utilisateur `PART3.pptx` et `PPPT PART1+PART2 +PART3.pptx`. Ils ont servi à relever les rubriques et les styles, mais ne sont pas chargés par le code à l'exécution. Les exemples de copropriété, de travaux et de montants qu'ils contiennent ne sont jamais des valeurs par défaut d'un rapport réel.

## État de l'implémentation

- `src/part3/reportData.ts` définit le contrat de saisie et les règles métier stables.
- `src/part3/reportDataValidation.ts` valide ce contrat sans appel réseau ni dépendance à Gemini.
- `src/part3/Part3ReportForm.tsx` expose le formulaire contrôlé depuis l’espace « 03 · Documentation et synthèse » de `App`. Les 17 choix, commentaires et fichiers DPE restent dans l’état du navigateur : ils ne sont ni persistés, ni placés dans le cache des diagnostics.
- `src/part3/curativeSummary.ts` dérive, en lecture seule, le tableau récapitulatif curatif depuis les diagnostics éligibles de Partie 2.
- `src/part3/part3StaticContent.ts` porte les textes fixes, structures et règles de valeurs inconnues ; `src/part3/part3Pptx.ts` reconstruit les pages A4, tableaux éditables, visuels DPE et continuations nécessaires. Les actifs fixes extraits du modèle sont servis depuis `public/part3/`.
- `appendPart3Slides` ajoute la Partie 3 à une présentation existante et retourne les entrées de sommaire consommées par l'assembleur interne. `buildPart3Pptx` est un point d’entrée autonome de développement/test : il n’est relié à aucun bouton de l’interface.
- `tests/part3ReportData.test.ts` protège les statuts obligatoires, les visuels DPE optionnels, le calcul du chiffrage et l'absence de mutation des diagnostics Partie 2 ; `tests/part3Pptx.test.ts` couvre le format A4, les pages de référence, le contenu éditable, les visuels DPE et la pagination du tableau curatif.

La Partie 2 reste inchangée : son interface, son export autonome, son contrat, ses priorités, son tri, ses tableaux et sa pagination ne sont pas modifiés par ces modules.

## Données de saisie Partie 3

Chaque ligne documentaire porte deux champs :

- un statut **obligatoire** parmi `Transmis`, `Non transmis` et `Non concerné` ;
- un commentaire **facultatif** ; une valeur fournie ne peut pas se réduire à des espaces.

Les 17 statuts obligatoires sont répartis comme suit :

| Rubrique | Lignes à renseigner |
| --- | --- |
| 5.1 Documents réglementaires et administratifs | Assurance de la copropriété ; immatriculation ; fiche synthétique ; règlement de copropriété ; compte bancaire séparé ; procès-verbaux des assemblées générales. |
| 5.2 Diagnostics techniques obligatoires | Dossier Technique Amiante ; CREP des parties communes ; DTG ; termites ; mérules. |
| 5.3 Contrat d'entretien | Maintenance des chaudières collectives inférieures à 400 kW ; supérieures à 400 kW ; carnet d'entretien de l'immeuble. |
| 5.4 Sécurité incendie | Registre de sécurité ; affichage des consignes dans les parties communes ; vérifications périodiques des installations incendie. |

Les deux captures de l'étiquette DPE collectif — **état initial** et **scénario de rénovation le plus ambitieux** — sont chacune indépendamment facultatives. Lorsqu'une image est importée, elle doit être JPG, PNG ou WEBP et ne pas dépasser 20 Mo. Elle reste locale à la session, sans envoi à `/api/analyze` ni à Gemini.

## Données dérivées : tableau récapitulatif des travaux curatifs

Le Tableau 1 généré par la Partie 3 ne crée pas un second jeu de diagnostics. Il lit `getExportableDiagnostics` de la Partie 2, avec ses critères d'éligibilité et son ordre déjà validés, puis conserve seulement :

1. Curatif Niveau 1 ;
2. Curatif Niveau 2 ;
3. Curatif Niveau 3.

Chaque ligne reprend l'intervention de Partie 2 comme nature des travaux et affiche un **montant TTC unique, éditable dans le PPTX**. Une intervention qui tient sur une page reste dans une seule ligne logique : le générateur pagine avant cette ligne au lieu de créer une seconde ligne vide pour la suite de son texte. La règle confirmée est :

- si les bornes minimum et maximum de l'estimation IA sont positives, finies et cohérentes, afficher leur moyenne arrondie à l'euro ;
- si l'estimation est absente, nulle, invalide ou inversée, afficher `À confirmer` ; ne jamais convertir cette absence en `0 €` ;
- le total d'un niveau vaut `0 €` lorsqu'il ne comporte aucune ligne, et `À confirmer` lorsqu'au moins une de ses lignes n'a pas de chiffrage exploitable ; le même principe vaut pour le total général.

Le libellé associé est : **« Estimation IA indicative — à vérifier par un ingénieur »**. L'ingénieur pourra donc contrôler et ajuster le montant unique avant diffusion du rapport final. Cette transformation ne relance aucune analyse et ne modifie pas les objets Partie 2.

## Contenu volontairement hors contrat de saisie

Les éléments suivants ne sont pas des champs utilisateur à inventer dans cette phase :

- les tableaux détaillés des scénarios énergétiques situés sous le DPE collectif ; seules les deux images facultatives sont prévues ;
- l'annexe Géorisques, dont le contenu source et les règles de production restent à fournir ; elle est rendue avec une mention `À confirmer`, sans prétendre qu’un rapport a été annexé ;
- les exemples chiffrés, contrats, travaux votés, dates et indicateurs présents dans les diapositives de référence ;
- le second tableau illustratif sous 5.3, qui contient des valeurs d'exemple et ne correspond pas à la table Statut/Commentaire demandée ;
- la numérotation globale et les renvois définitifs du sommaire, qui sont dérivés par l'assemblage interne à partir des diapositives produites ; les totaux curatifs et statistiques disponibles sont déjà dérivés lors du rendu Partie 3.

Les textes réglementaires, les titres, les listes et les structures fixes du modèle sont reproduits **tels quels** par le générateur. Ils ne sont ni modernisés automatiquement ni transformés en valeurs à saisir. Les exemples de copropriété, de montants, de dates ou de documents du modèle ne sont jamais injectés dans un rapport réel : une donnée hors contrat reste `À confirmer`.

## Typographie et liens des pages fixes

- Les textes de corps sont générés en **Calibri 11 pt**. Les couvertures, titres, sous-titres, en-têtes de tableaux, chevrons et pieds de page conservent leurs styles dédiés.
- Les sources des pages 8.2, 8.3 et 8.4 sont des liens PowerPoint externes éditables ; elles pointent respectivement vers les pages Service Public CEE, éco-PTZ et la page economie.gouv.fr indiquées dans le contenu statique.
- Le texte `www.georisques.gouv.fr` de l’annexe 11.1 est également un lien PowerPoint vers `http://www.georisques.gouv.fr/`.
- Le renvoi de la page 8.2 est placé à la suite du dernier bloc de contenu, au lieu d’être ancré artificiellement près du pied de page.

## État de réalisation et prochaines validations

1. **Réalisé — formulaire contrôlé.** Les 17 choix obligatoires, commentaires facultatifs et deux imports DPE facultatifs sont reliés à `Part3ReportData` et à sa validation.
2. **Réalisé — générateur Partie 3.** Le générateur A4 produit les 25 pages de référence au minimum, ajoute des continuations lorsque les tableaux l’exigent et conserve les textes/tableaux PowerPoint éditables.
3. **Réalisé — liaison des données dérivées.** Les visuels DPE facultatifs et le tableau curatif dérivé sont connectés au rendu, sans modifier l’export autonome de Partie 2.
4. **Réalisé — assemblage P1+P2+P3.** L'assembleur consomme `appendPart3Slides`, recalcule le sommaire, les pieds de page, la numérotation et le total à partir des diapositives effectivement produites.
5. **Réalisé — préparation et export final contrôlé.** L'espace 03 affiche l'état P1/P2/P3, l'aperçu curatif en lecture seule et le bouton d'export. Les fichiers P1/P3 restent exclusivement en mémoire de session ; l'absence de visuels DPE ne bloque pas l'export, mais un visuel fourni invalide le bloque jusqu'à correction.
6. **Validation de mise en service.** Le flux local et le téléchargement sur le déploiement public ont été testés par l’utilisateur le 8 octobre 2026. Toute correction de mise en page ou de typographie appelle néanmoins une nouvelle comparaison visuelle ciblée dans PowerPoint avant sa validation finale.
