# Diagnostic Technique Bâtiment

Application React/Vite d'analyse de photos de visite technique. L'interface envoie une photo à la fois à une API serveur, qui vérifie le compte Google du membre et appelle le modèle Gemini principal avec **sa propre clé Gemini**. En cas d'indisponibilité 503/504, le serveur essaie un modèle de secours avec la même clé.

Chaque réponse est une **pré-analyse photographique indicative et concise** : priorité, périmètre apparent, domaines, constat visible, risque conditionnel, action recommandée, vérification sur site, confiance et limites de la photo. La hiérarchisation affichée est une grille interne, à confirmer par un professionnel sur site ; elle ne constitue pas un PPPT complet.

L'architecture décidée pour moins de 10 membres est détaillée dans [STRATEGIE_VERCEL_HOBBY.md](STRATEGIE_VERCEL_HOBBY.md). Aucun stockage de photos, de diagnostics ou de clés des membres n'est ajouté à l'application.

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
