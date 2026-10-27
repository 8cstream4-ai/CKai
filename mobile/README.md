# CKai Android — version native 0.2

Projet **Expo / React Native**, distinct du fichier HTML précédent. L’application utilise directement Groq, avec le moteur testé du dossier `../src/ai`. L’icône CKai originale est intégrée à la configuration Android et à l’interface.

**État actuel : sources préparées, syntaxe TS/TSX vérifiée, mais dépendances non installées et APK non compilé. Ne pas considérer ce dossier comme une version déjà testée sur téléphone.**

## Installation et APK

Une autre voie est préparée dans [la compilation GitHub Actions](../docs/github-build.md). Elle utilise les serveurs GitHub pour compiler avec Gradle, sans connexion Expo, lorsque le dépôt privé et son secret Groq sont disponibles. Aucun workflow n’a encore été exécuté.

Prérequis : Node 24, Java et Android SDK/NDK compatibles avec React Native 0.88, accès npm et aux dépôts Android. Les dépendances Expo sont choisies à partir de son manifeste officiel installé, pour éviter de mélanger des versions.

Depuis ce dossier :

```sh
npm run setup
npm run typecheck
npx expo-doctor
npm run apk
```

`npm run apk` effectue le contrôle TypeScript et la compatibilité des dépendances, génère le projet Android, puis demande une compilation Gradle **release**, avec le JavaScript embarqué. La sortie attendue après réussite est `../artifacts/CKai-test.apk`. Le script ne crée pas de faux APK si une étape échoue. Pour cette distribution privée, la signature de test issue du projet Android généré doit être vérifiée avant diffusion ; une clé de signature de production n’est pas préparée ici.

Pour un development build avec un téléphone ou émulateur connecté :

```sh
npm run android
npm start
```

Expo Go n’est pas la cible. Le profil EAS `preview` est également prévu pour un APK ; un compte Expo, une configuration de projet EAS et une variable secrète `GROQ_API_KEY` côté EAS sont nécessaires avant cette voie de compilation. Aucun compte ni projet EAS n’a été inventé ou créé.

## Clé intégrée, à ta demande

Le script `provision` charge la clé depuis `../.env.local` pour un build local, ou depuis `GROQ_API_KEY` pour EAS, puis génère `_private/bootstrap.json`. Ce fichier est exclu de Git et n’affiche jamais la valeur dans les logs. Au premier démarrage, la clé est copiée dans `expo-secure-store` ; une clé déjà enregistrée est conservée.

La clé de démarrage est embarquée dans **ce build privé** pour permettre l’utilisation sans ressaisie. SecureStore protège ensuite la copie locale ; cela ne retire pas la clé de démarrage du paquet compilé. La clé fournie n’a pas été révoquée.

Dans Réglages, « Tester la connexion » vérifie la clé et la présence du modèle via Groq, avec un timeout de 15 secondes. Une clé de remplacement n’écrase la précédente qu’après validation du catalogue. Ce test ne promet pas qu’une requête de génération ne rencontrera jamais de quota.

## Fonctions écrites

- Profil local avec prénom ; onboarding simple expliquant l’envoi des messages à Groq.
- Chat natif, réponse progressive regroupée à 40 ms, arrêt avec texte conservé, copie, partage Android et régénération de la dernière réponse.
- Historique SQLite, recherche par titre, suppression par appui long, brouillons locaux.
- Sauvegarde du message en cours toutes les 400 ms environ et à la mise en arrière-plan. Une réponse restée en cours à la fermeture est marquée interrompue au redémarrage.
- Auto / Rapide / Équilibré / Fort ; réflexion Courte / Moyenne / Profonde. Moyen et Fort utilisent tous deux GPT-OSS 120B. Fenêtre glissante limitée à 10 000 caractères, sans prétendre réaliser un résumé automatique.
- Markdown natif sécurisé limité à paragraphes, titres, listes, citations, code, gras et liens. Pas d’évaluation HTML.
- Timeline des opérations réelles et outil date/heure ; aucun raisonnement privé inventé.
- Thèmes sombre, crème, AMOLED ; orbe animée avec Reanimated et réduction des animations système ; retour haptique désactivable.
- États d’erreur de connexion, quota, clé, stockage et interruption ; bouton Réessayer.

L’application ne comprend pas encore : biométrie/PIN, profils multiples isolés, recherche web et citations, pièces jointes, vision, génération d’images, RAG, voix, graphiques, LaTeX, export chiffré, i18n complète ou transport Vercel AI SDK. Le transport REST déjà testé sert de base à cette version. Aucun de ces modules absents n’est présenté par un bouton factice.

## Vérifications effectuées

- 26 tests Node réussis sur le moteur, les arrêts, les erreurs, les outils, la fenêtre de contexte et le parseur Markdown.
- Analyse de syntaxe Babel des huit fichiers TS/TSX de l’application, réussie. **Ce n’est pas un contrôle de types.**
- Configuration privée générée sans afficher la clé.
- Accès npm échoué avec `EPERM` sur la socket du proxy. `tsc` et Android SDK ne sont pas installés : typecheck, compilation, test de lancement et test réel Groq non validés.

Une fois le réseau et la compilation disponibles, vérifier sur un appareil : créer le profil, obtenir une vraie réponse, arrêter une réponse longue, fermer/rouvrir le chat, tester la clé, changer le thème, copier/partager, tester une erreur réseau puis Réessayer. Vérifier aussi l’absence de clavier recouvrant le composer et le comportement du bouton Retour Android.

## Références officielles consultées

- [Expo SDK 58](https://expo.dev/changelog/sdk-58), [versions compatibles](https://docs.expo.dev/versions/v58.0.0/).
- [Expo Router](https://docs.expo.dev/router/installation/), [fetch et encodage](https://docs.expo.dev/versions/latest/sdk/expo/).
- [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
- [FlashList 2](https://shopify.github.io/flash-list/docs/usage/), [compilation Android](https://docs.expo.dev/build-reference/apk/).
