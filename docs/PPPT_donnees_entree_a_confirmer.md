# PPPT — Inventaire des données d’entrée à confirmer

## Objectif

Ce document extrait **uniquement les données qui semblent devoir être saisies, sélectionnées, importées ou générées** pour automatiser le remplissage du PowerPoint fourni.

Il ne décrit pas encore l’interface utilisateur et ne contient pas de code.

**Fichier analysé :** `PPPT 18 rue de la Barrière_Avec TE.pptx`  
**Nombre de diapositives présentes dans le fichier :** 9

> Important : le sommaire annonce des sections jusqu’à 11, mais le fichier fourni s’arrête à l’introduction (diapositive 9). Les données des rubriques travaux, curatifs, travaux énergétiques, chiffrages, financements, annexes, etc. ne sont donc pas présentes dans ce fichier et ne peuvent pas encore être extraites.

---

# 1. Données principales du rapport

| Donnée à renseigner | Exemple présent dans le fichier | Usage repéré |
|---|---|---|
| Nom de la copropriété / résidence | `LE COTE SQUARE` | Couverture, mission, pied de page, description |
| Adresse de la copropriété / du site | `18 Rue de la Barrière, Rive de Gier` | Couverture, localisation, description |
| Date de visite | `01/06/2026` | Couverture |
| Date du rapport | `07/08/2026` | Couverture |
| Version du rapport | `Initiale` | Couverture |
| Nombre total de pages | `X pages` | Couverture — à calculer automatiquement plutôt qu’à saisir |

## Valeurs dérivées à ne pas ressaisir

- Texte de pied de page : `Copropriété [Nom de la copropriété]`.
- Phrase de mission : reprend le nom de la copropriété et le syndic.
- Numéros de diapositives/pages.
- Nombre total de pages du rapport final.

---

# 2. Donneur d’ordre / Syndic

| Donnée à renseigner | Exemple |
|---|---|
| Nom du donneur d’ordre / syndic | `Régie l'immobilière Stéphanoise` |
| Adresse du donneur d’ordre / syndic | `7 rue Voltaire 42100 Saint Etienne` |

La couverture réutilise également le nom du syndic dans la phrase :  
`Mission réalisée pour la copropriété [COPROPRIÉTÉ], représentée par son syndic, [SYNDIC]`.

---

# 3. Équipe en charge du rapport

## Chargé de projet

| Donnée à renseigner | Exemple |
|---|---|
| Nom | `Anthony BELTRAN` |
| Poste / fonction | `Ingénieur thermicien – Chargé de projet du pôle Copropriété et Tertiaire` |

## Vérificateur

| Donnée à renseigner | Exemple |
|---|---|
| Nom | `Mahmoud ATIQ` |
| Poste / fonction | `Ingénieur thermicien – Responsable du pôle Copropriété et Tertiaire` |

## Intervenant sur site

| Donnée à renseigner | Exemple |
|---|---|
| Nom | `Youssef BICHA` |

> À confirmer pour la future interface : ces personnes pourraient être choisies dans une liste de collaborateurs plutôt que saisies à chaque rapport.

---

# 4. Émetteur du rapport — données probablement fixes / paramétrables une seule fois

Ces informations sont présentes dans le rapport, mais semblent appartenir au modèle France Verte et non au projet de copropriété lui-même.

| Donnée | Valeur actuelle |
|---|---|
| Raison sociale | `SAS France Verte` |
| Adresse | `22 Avenue Barthélémy Thimonnier, 69300 Caluire-et-Cuire` |
| E-mail | `contact@groupefranceverte.fr` |
| Téléphone | `09 86 08 79 79` |
| Site internet | `https://www.francevertepro.fr/` |

Ces données seraient plutôt à conserver dans des **paramètres globaux** du modèle.

---

# 5. Localisation et informations cadastrales

| Donnée à renseigner | Exemple |
|---|---|
| Adresse de localisation | `18 Rue de la Barrière, Rive de Gier` |
| Référence cadastrale | `AV 0359` |

## Source affichée dans le modèle

- `https://www.geoportail.gouv.fr/`

Cette URL semble être une source fixe du modèle et non une donnée spécifique à ressaisir.

---

# 6. Description de la copropriété

| Donnée à renseigner | Exemple présent |
|---|---|
| Résidence | `LE COTE SQUARE` |
| Adresse du site | `18 Rue de la Barrière, Rive de Gier` |
| Année de construction | `Entre 2001 et 2010` |
| Date du règlement de copropriété | `06/03/2007` |
| Date d’immatriculation | `27/07/2017` |
| Numéro d’immatriculation | `AA7634256` |
| Nombres de bâtiments | `1` |
| Nombres d’entrées | `1` |
| Nombre total de lots | `61` |
| Nombres de niveaux | `4` |
| Nombre total de lots principaux | `22` |
| Type de chauffage | `Individuel` |
| Nombre total de lots à usage d’habitation | `22` |
| Nombres d’ascenseur | `1` |
| SHAB approximative | `1676,3` |
| Altitude | `250` |

## Données potentiellement réutilisées

- `Résidence` peut être identique au `Nom de la copropriété`.
- `Adresse du site` peut être identique à l’`Adresse de la copropriété`.

L’interface future devrait éviter une double saisie si ces valeurs sont identiques.

---

# 7. Statut patrimonial

Le document présente trois situations possibles, avec un état `Concerné / Non concerné`.

| Situation | Exemple dans le fichier |
|---|---|
| Aucun périmètre de protection | `Concerné` |
| Site patrimonial remarquable | `Non concerné` |
| Abords d’un monument historique | `Non concerné` |

## Champ supplémentaire à confirmer

Le tableau contient également :

- Votre situation : c'est simplement d’un élément fix du modèle.

## Source affichée dans le modèle

- `http://atlas.patrimoines.culture.fr/atlas/trunk/`

Cette URL semble être une source fixe.

---

# 8. Images / documents visuels à importer

Quatre visuels sont clairement spécifiques à la copropriété et devraient être considérés comme des données d’entrée ou comme des visuels générés à partir de l’adresse.

## 8.1 Photo principale de la copropriété

- **Type :** photo du bâtiment / façade / entrée.
- **Emplacement :** couverture.
- **Exemple actuel :** photographie verticale du bâtiment `LE COTE SQUARE`.
- **Entrée future probable :** import d’une image.

## 8.2 Extrait cadastral

- **Type :** capture cartographique cadastrale.
- **Emplacement :** informations administratives / localisation.
- **Exemple actuel :** capture avec parcelles et référence `0359`.
- **Entrée future possible :** import manuel d’une capture ou génération/récupération à partir de l’adresse/référence cadastrale.

## 8.3 Vue aérienne rapprochée du bâtiment

- **Type :** vue satellite / aérienne centrée sur la copropriété.
- **Emplacement :** description de la copropriété.
- **Entrée future possible :** import d’une image ou génération/récupération automatique à partir de l’adresse.

## 8.4 Vue cartographique / aérienne associée à la situation patrimoniale

- **Type :** vue aérienne large de l’environnement du site.
- **Emplacement :** page du statut patrimonial.
- **Entrée future possible :** import d’une capture ou génération/récupération automatique.
- **À confirmer :** source exacte souhaitée pour ce visuel (Atlas des patrimoines, Géoportail, autre).

---

# 9. Images qui semblent fixes et ne devraient pas être demandées à chaque rapport

Les visuels suivants appartiennent au modèle graphique / à l’identité France Verte :

- Logo France Verte dans l’en-tête.
- Logo / visuel `RGE OPQIBI`.
- Visuel de coordonnées / tampon France Verte sur la couverture.
- Éléments décoratifs bleu et jaune de la couverture.
- Logo répété sur les pages internes.

Ils devraient normalement être stockés dans le modèle et non importés par l’utilisateur à chaque projet.

---

# 10. Sommaire — données non manuelles

Le fichier contient un sommaire sur deux diapositives avec les intitulés des sections.

Les intitulés semblent être **fixes** dans ce modèle. La deuxième colonne est actuellement vide et semble destinée aux numéros de pages.

Pour l’automatisation, les éléments suivants devraient être calculés/générés et non saisis manuellement :

- Numéro de page de chaque rubrique du sommaire.
- Nombre total de pages.
- Numéros de diapositives/pages.

---

# 11. Contenus considérés comme fixes dans les 9 diapositives actuelles

Aucune saisie utilisateur n’est nécessaire pour les textes suivants, sauf si le modèle doit devenir éditable :

- Titre `PPPT — Projet de Plan Pluriannuel de Travaux`.
- Mentions légales de la couverture.
- Texte explicatif du statut patrimonial.
- Définitions des trois catégories patrimoniales.
- Sommaire / structure des sections.
- `1.1 Cadre réglementaire du Projet de Plan Pluriannuel de Travaux (PPPT)`.
- `1.2 Validité du présent rapport`.
- `1.3 Périmètre de la mission et réserves`.
- `1.4 Limite de la mission`.
- `1.5 Hiérarchisation des travaux et des observations`.
- Définitions : Entretien, Signalements, Travaux prioritaires, Travaux à moyen terme, Travaux d’esthétiques, Travaux énergétiques.
- Libellés `Curatif Niveau 1`, `Curatif Niveau 2`, `Curatif Niveau 3`, `Entretien`, `Signalement`, `Travaux énergétiques`.

---

# 12. Éléments techniques / notes du fichier à ne pas traiter comme données utilisateur

Deux éléments semblent être des résidus de travail dans le PowerPoint et non des données à saisir :

- Un texte `1` placé hors de la zone visible sur la diapositive 3.
- Une note `Partie Ayoub / Anthony` placée hors de la zone visible sur la diapositive 4.

Ils devraient être vérifiés avant la version finale du modèle d’automatisation.

---

# 13. Liste consolidée des entrées utilisateur proposées

## Projet / rapport

- Nom de la copropriété.
- Adresse de la copropriété / du site.
- Date de visite.
- Date du rapport.
- Version du rapport.

## Syndic / donneur d’ordre

- Nom.
- Adresse.

## Équipe

- Chargé de projet : nom, poste.
- Vérificateur : nom, poste.
- Intervenant sur site : nom.

## Localisation / cadastre

- Référence cadastrale.

## Caractéristiques de la copropriété

- Année de construction.
- Date du règlement de copropriété.
- Date d’immatriculation.
- Numéro d’immatriculation.
- Nombre de bâtiments.
- Nombre d’entrées.
- Nombre total de lots.
- Nombre de niveaux.
- Nombre total de lots principaux.
- Type de chauffage.
- Nombre total de lots à usage d’habitation.
- Nombre d’ascenseurs.
- SHAB approximative.
- Altitude.

## Statut patrimonial

- Aucun périmètre de protection : Concerné / Non concerné.
- Site patrimonial remarquable : Concerné / Non concerné.
- Abords d’un monument historique : Concerné / Non concerné.
- `Votre situation` : champ / comportement à confirmer.

## Images

- Photo principale du bâtiment.
- Extrait cadastral.
- Vue aérienne rapprochée.
- Vue cartographique/aérienne liée au statut patrimonial.

---

# 14. Valeurs à générer automatiquement plutôt qu’à demander à l’utilisateur

- Phrase complète de mission.
- Nom de copropriété dans les pieds de page.
- Numérotation des pages/diapositives.
- Nombre total de pages.
- Numéros de page du sommaire.
- Réutilisation du nom/adresse de la copropriété dans les différentes diapositives.

---

# 15. Points à confirmer avant de passer à la conception de l’interface

1. `Nom de la copropriété` et `Résidence` représentent-ils toujours la même donnée ?
2. `Adresse de la copropriété`, `Adresse du site` et `Adresse de localisation` doivent-elles être un seul champ partagé ?
3. Les collaborateurs (chargé de projet, vérificateur, intervenant) doivent-ils être choisis dans une liste prédéfinie ?
4. Les informations de France Verte doivent-elles rester totalement fixes ou être modifiables dans des paramètres ?
5. Que représente exactement `Votre situation : *` sur la page patrimoniale ?
6. Les captures cadastrales/aériennes seront-elles **importées manuellement** ou **récupérées/générées automatiquement** depuis une adresse/référence ?
7. Le fichier fourni ne contient que 9 diapositives : faut-il analyser un second fichier contenant les sections 2 à 11 avant de définir l’interface complète ?

