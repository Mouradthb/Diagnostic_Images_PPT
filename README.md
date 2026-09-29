# Diagnostic Technique Bâtiment

Application React/Vite d'analyse de photos de visite technique. L'interface envoie une photo à la fois à une API serveur, qui vérifie le compte Google du membre et appelle le modèle Gemini principal avec **sa propre clé Gemini**. En cas d'indisponibilité 503/504, le serveur essaie le modèle de secours `gemini-3.5-flash-lite` avec la même clé.

Chaque réponse est une **pré-analyse photographique indicative et concise** : priorité, périmètre apparent, domaines, constat visible, risque conditionnel, action recommandée, vérification sur site, confiance et limites de la photo. La hiérarchisation affichée est une grille interne, à confirmer par un professionnel sur site ; elle ne constitue pas un PPPT complet.

L'architecture décidée pour moins de 10 membres est détaillée dans [STRATEGIE_VERCEL_HOBBY.md](STRATEGIE_VERCEL_HOBBY.md). Aucun stockage serveur ou service payant n'est ajouté. Les diagnostics réussis peuvent être conservés 24 heures dans ce navigateur ; les photos et les clés Gemini ne sont jamais enregistrées dans cette conservation locale.

## Localisation des photos

Sous chaque photo importée, le membre peut choisir **Parties communes**, **Parties privatives** ou **Non renseignée** (par défaut). Ce contexte accompagne la photo dans l'appel d'analyse existant, y compris lors d'un réessai ou du passage au modèle de secours. Le résultat distingue la localisation déclarée du périmètre évalué par Gemini.

Une localisation privative ne diminue pas automatiquement une priorité curative si un risque sérieux visible peut affecter les parties communes, à partir d'indices concrets de la photo. Tout impact collectif incertain doit être vérifié sur site.

Modifier la localisation d'une photo déjà analysée conserve son résultat et le signale comme **à actualiser**. Aucun appel n'est lancé automatiquement : utiliser **Actualiser l'analyse** pour cette photo ou reprendre le lot. Revenir au choix utilisé par le diagnostic retire ce besoin d'actualisation. Après un rechargement, réimporter les mêmes photos et sélectionner la même localisation permet de réutiliser les diagnostics encore conservés, puis lancer le lot pour les retrouver. Les photos elles-mêmes doivent être sélectionnées à nouveau.

## Fiabilité dans le niveau gratuit

- Le lot et les réessais individuels suivent le même rythme : un appel à la fois, puis au moins 15 secondes de pause. Les onglets du même navigateur sont coordonnés lorsque Web Locks est disponible. Ce contrôle ne coordonne pas d'autres appareils ni les appels provenant d'autres applications du même projet Google.
- Après un `503/504`, le serveur essaie le modèle de secours avec la clé du même membre. Si cet essai échoue aussi temporairement, l'interface attend au moins 30 secondes avec un léger délai aléatoire, puis effectue **une seule reprise**, sur le secours uniquement. Une nouvelle erreur suspend le lot.
- Un `429` est classé à partir des détails de quota fournis par Google. Une limite par minute identifiée autorise une seule reprise après au moins 60 secondes ou le délai Google s'il est plus long. Un quota quotidien épuisé arrête les appels jusqu'au prochain renouvellement à minuit heure du Pacifique, avec une minute de marge. Si la cause du `429` est inconnue, aucun réessai automatique n'est lancé ; vérifier le projet dans Google AI Studio. Les limites longues nécessitent une reprise manuelle.
- Le délai serveur est plafonné à 55 secondes au total, avec 25 secondes par modèle. L'interface attend jusqu'à 70 secondes par requête. Une connexion interrompue suspend le lot sans réessai automatique. **Arrêter l'analyse** annule l'attente et la requête en cours, en conservant les résultats déjà obtenus ; une demande déjà reçue par Google peut toutefois avoir consommé du quota.
- Un diagnostic n'est réutilisé que pour le même compte Firebase, le contenu exact de la photo, sa localisation et la même version de consigne/contrat/modèles. La conservation locale dure 24 heures, contient au maximum 200 résultats et reste facultative : un navigateur refusant le stockage n'empêche pas l'analyse. **Tout effacer** retire aussi les résultats conservés du compte. Les comptes partagent le stockage physique du navigateur ; utiliser un profil privé distinct sur un ordinateur partagé.
- La conservation locale évite les réanalyses ; elle n'augmente pas les limites Google. Les limites sont celles du projet Google et du modèle, pas celles d'une clé. Aucune facturation ou nouvelle plateforme n'est activée.

Les réponses d'erreur ne contiennent que le message public et des indications de reprise (`code`, `canRetry`, `retryAfterSeconds`). Les journaux restent limités à la localisation, l'étape, le modèle et le statut fournisseur ; aucune photo, clé ou réponse Gemini brute n'est enregistrée.

## Configuration initiale

1. Créer un projet Firebase, enregistrer une application Web et activer le fournisseur de connexion **Google** dans Firebase Authentication.
2. Dans Firebase Authentication > Settings > Authorized domains, autoriser le domaine Vercel de l'application. Pour le développement local, ajouter aussi `localhost` si nécessaire.
3. Créer les identifiants Firebase Admin pour le serveur. Garder la clé privée hors du dépôt.
4. Copier les noms de variables de [.env.example](.env.example) dans `.env.local` pour le développement et dans les variables d'environnement du projet Vercel pour la production. Les variables `VITE_FIREBASE_*` sont publiques et intégrées au build ; `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` et `GEMINI_KEYS_BY_UID` restent privées, côté serveur.
5. Configurer d'abord `GEMINI_KEYS_BY_UID` à `{}`. Après la première connexion d'un membre, relever son `uid` dans Firebase Authentication et associer ce `uid` à la clé Gemini de **son projet Google**. Exemple de forme JSON, avec de fausses valeurs : `{"UID_A":"CLE_A","UID_B":"CLE_B"}`.

Les utilisateurs de l'application n'ont pas besoin de comptes Vercel. Seul l'administrateur configure ou remplace les clés dans Vercel. Toute modification des variables Vercel nécessite un nouveau déploiement. Ne jamais communiquer une clé Gemini à l'interface ou la placer dans une variable `VITE_*`.

## Développement local

Installer les dépendances avec `npm install`, puis démarrer avec `npm run dev`. L'application est servie sur `http://localhost:3000`. Le serveur local et les fonctions Vercel utilisent la même logique d'authentification et d'analyse.

Vérifications locales : `npm run lint`, `npm test` et `npm run build`. Le build Vite produit `dist/` ; les fonctions Vercel sont dans `api/`.

Pour tester l'interface sans consommer de quota, ouvrir `/tests/browser-reliability.html?scenario=overload&run=ESSAI_UNIQUE` sur le serveur local. Les scénarios `success`, `daily` et `unknown` sont également disponibles. Cette page simule les réponses dans le navigateur et n'est pas incluse dans le build de production.

## Déploiement Vercel

Importer le dépôt dans Vercel avec le préréglage **Vite**, la commande de build `npm run build` et le dossier de sortie `dist`. Les fichiers de `api/` sont déployés comme fonctions Vercel. Renseigner toutes les variables d'environnement avant le build, puis ajouter le domaine de production à Firebase Authentication.

L'API accepte seulement les membres Google vérifiés et présents dans `GEMINI_KEYS_BY_UID`. Elle limite les images à JPG, PNG ou WEBP et les requêtes à moins de 4,5 Mo, limite imposée par Vercel. Une erreur de quota ou de clé n'entraîne jamais l'utilisation d'une autre clé.

Le plan Vercel Hobby est réservé à un usage personnel et non commercial. Si l'application sert à l'activité professionnelle de l'équipe, utiliser un plan Vercel adapté.

## Vérification avant partage

- Compte déconnecté : l'API refuse l'analyse.
- Compte Google absent de `GEMINI_KEYS_BY_UID` : aucune analyse possible.
- Deux membres configurés : chacun voit sa propre consommation dans son projet Google.
- Une clé invalide ou un quota épuisé affecte uniquement le membre concerné.
- Une photo trop grande affiche une erreur compréhensible.
- Aucune clé Gemini n'apparaît dans `dist/`, les réponses API ou les journaux.
