# Stratégie de déploiement : Vercel Hobby et clés Gemini par membre

Statut : architecture retenue et implémentée localement. Ce document reste la référence des choix de mise en œuvre ; aucun déploiement ni test avec de vraies clés de membres n'a encore été effectué.

État au 17 septembre 2026 : interface de connexion Google, vérification Firebase côté API, sélection de clé par `uid`, fonction Vercel et modèle `gemini-3.6-flash` implémentés. Le type-check, le build Vite et les tests locaux de refus d'accès passent. La configuration du projet Firebase, des clés des membres et du projet Vercel reste à faire avec l'administrateur.

## Objectif et périmètre

- Héberger l'application React/Vite sur Vercel pour moins de 10 membres.
- Réserver l'analyse des photos aux membres autorisés, connectés avec leur compte Google.
- Utiliser, pour chaque membre, une clé Gemini issue de **son propre projet Google**. Les limites Gemini sont calculées par projet, pas par clé : plusieurs clés créées dans un même projet ne séparent pas les quotas.
- Garder les clés exclusivement côté serveur. Un administrateur unique ajoute, remplace ou retire les clés dans les paramètres Vercel.
- Ne pas ajouter de base de données pour cette première version. Les photos et résultats restent dans l'état du navigateur ; aucun historique partagé ou persistant n'est prévu.
- Employer `gemini-3.6-flash` pour l'analyse. Vérifier sa disponibilité et ses limites gratuites dans le projet Google de chaque membre avant l'ouverture du service.

## Condition d'utilisation de Vercel Hobby

Le plan Hobby est réservé par Vercel à un usage personnel et non commercial. Avant le déploiement, confirmer que l'usage réel de cette application répond à cette condition. Si les diagnostics servent à l'activité professionnelle de l'équipe, conserver l'architecture ci-dessous mais utiliser un plan Vercel adapté, comme Pro. Le nombre de membres ne change pas cette condition.

## Architecture retenue

1. **Interface** : Vercel sert le build statique Vite de l'application React.
2. **API** : une Vercel Function côté serveur traite `/api/analyze` et appelle Gemini. Le code Express actuel doit être adapté à ce mode de déploiement ; il n'y a pas de serveur Node permanent à gérer.
3. **Authentification** : Firebase Authentication fournit la connexion Google. L'interface transmet un jeton d'identité à l'API par HTTPS. L'API vérifie ce jeton à chaque demande d'analyse et récupère l'identifiant Firebase stable (`uid`).
4. **Autorisation et sélection de clé** : une variable d'environnement privée Vercel, par exemple `GEMINI_KEYS_BY_UID`, contient une correspondance `uid → clé Gemini` pour les seuls membres autorisés. Une identité vérifiée mais absente de cette correspondance ne peut pas lancer d'analyse. L'identifiant stable évite de dépendre d'une adresse e-mail modifiée.
5. **Appel Gemini** : pour chaque requête, l'API sélectionne la clé correspondant au `uid` vérifié, crée un client Gemini pour cette clé et appelle uniquement `gemini-3.6-flash`. Elle ne prend jamais une clé envoyée par le navigateur et ne bascule jamais vers la clé de l'administrateur ou celle d'un autre membre.

```text
Membre → connexion Google → jeton vérifié par l'API Vercel
                                  ↓
                         uid autorisé → clé privée correspondante
                                  ↓
                         Gemini 3.6 Flash → résultat du membre
```

Firebase Authentication gère les comptes ; aucune collection Firestore n'est requise pour ce scénario. Seul l'administrateur a besoin d'accéder au projet Vercel. Les membres qui utilisent l'application n'ont pas besoin d'être invités comme membres du projet Vercel.

## Gestion des membres et des clés

### Ajouter un membre

1. Le membre se connecte une première fois avec Google pour créer son identité Firebase.
2. L'administrateur relève son `uid` dans Firebase Authentication et confirme que le compte correspond au membre attendu.
3. Le membre crée une clé Gemini dans **son propre projet Google** et la transmet à l'administrateur par un canal privé.
4. L'administrateur ajoute la correspondance `uid → clé` dans la variable privée Vercel, puis déploie la nouvelle configuration. Les modifications de variables Vercel ne s'appliquent pas aux déploiements déjà créés.
5. Le membre effectue une analyse de test et vérifie, dans son projet Google, que la consommation apparaît sur son quota.

### Remplacer ou retirer une clé

- Pour remplacer une clé, l'administrateur met à jour la correspondance Vercel et redéploie ; le membre révoque ensuite l'ancienne clé dans Google AI Studio.
- Pour retirer l'accès à l'application, l'administrateur supprime le `uid` de la correspondance et redéploie. Il peut aussi désactiver le compte dans Firebase Authentication.
- Aucun secret ne doit figurer dans Git, dans le build Vite, dans une variable exposée au navigateur, dans l'URL ou dans les journaux applicatifs.
- Les variables privées de Firebase nécessaires à la vérification des jetons sont elles aussi configurées côté serveur dans Vercel ; la configuration publique Firebase de l'interface ne contient pas les clés Gemini.

Cette gestion est volontairement manuelle. Si les membres doivent un jour saisir et modifier eux-mêmes leur clé dans l'application, il faudra ajouter un stockage persistant adapté pour les clés chiffrées et revoir cette stratégie.

## Changements nécessaires dans le projet actuel

1. **Déploiement Vercel** : produire le build Vite pour l'interface et exposer `/api/analyze` comme fonction serveur. Conserver le flux d'une photo par appel. Ne pas supposer que la mémoire ou les fichiers locaux d'une fonction persistent entre les appels.
2. **Connexion et accès** : ajouter la connexion Google, vérifier le jeton côté API et refuser les utilisateurs non configurés. Masquer ou désactiver l'analyse pour un membre sans clé, sans s'appuyer uniquement sur ce contrôle visuel.
3. **Clé par requête** : retirer le client Gemini global et la lecture de `GEMINI_API_KEY` / `API_KEY` comme clé commune. Choisir la clé à partir du `uid` vérifié lors de chaque appel.
4. **Modèle** : le serveur essaie actuellement `gemini-3.1-flash-lite` avant `gemini-3.6-flash`, puis d'autres modèles. Fixer le modèle voulu à `gemini-3.6-flash` pour éviter une sélection silencieuse d'un autre modèle. Afficher clairement les erreurs de clé invalide et de quota atteint ; ne pas basculer vers une autre clé.
5. **Photos** : Vercel limite le corps d'une requête de fonction à 4,5 Mo. Mesurer la taille du JSON **après conversion base64**, compresser davantage si nécessaire, puis refuser proprement une photo encore trop volumineuse. Remplacer la limite Express actuelle de 50 Mo par une limite cohérente avec Vercel. Valider format et taille côté API également.
6. **Réponse** : valider les trois champs du résultat Gemini côté serveur avant de renvoyer le diagnostic. Limiter les tentatives automatiques afin qu'une erreur ne consomme pas inutilement le quota du membre.
7. **Préparation du build** : réparer l'environnement local Node/npm et la dépendance native Rollup manquante, puis obtenir un build et une vérification TypeScript réussis avant le déploiement.

## Vérifications avant ouverture à l'équipe

- Un visiteur non connecté reçoit un refus de `/api/analyze`.
- Un compte Google connecté mais absent de la liste autorisée reçoit un refus.
- Deux membres autorisés analysent chacun une photo ; chaque appel utilise sa propre clé et apparaît dans son propre projet Google.
- Une clé invalide ou un quota épuisé affecte uniquement le membre concerné. Aucune clé commune ou clé d'un autre membre n'est utilisée en secours.
- Une photo trop volumineuse reçoit un message compréhensible avant d'atteindre la limite Vercel.
- Les clés sont absentes des fichiers du dépôt, du JavaScript livré au navigateur, des réponses API et des journaux.
- La rotation d'une clé suivie d'un redéploiement fonctionne ; l'ancienne clé peut être révoquée.
- Le build, l'authentification et l'analyse d'une photo sont vérifiés sur le déploiement Vercel avant de communiquer l'URL à l'équipe.

## Références à revérifier au moment du déploiement

- [Vercel : déploiement de Vite et fonctions API](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel : limites des fonctions, dont le corps de requête](https://vercel.com/docs/functions/limitations)
- [Vercel : variables d'environnement](https://vercel.com/docs/environment-variables)
- [Vercel : conditions du plan Hobby](https://vercel.com/legal/terms)
- [Firebase : connexion Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase : vérification des jetons côté serveur](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Gemini : quotas par projet](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini : modèle et tarif du niveau gratuit](https://ai.google.dev/gemini-api/docs/pricing)
