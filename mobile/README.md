# CKai Android — 0.3

Application native Expo SDK 58 / React Native 0.88. Groq répond directement depuis le téléphone ; les clés sont conservées dans SecureStore, l’historique et la mémoire dans SQLite, les fichiers dans le répertoire privé de l’application.

## Compiler et installer

La voie de livraison utilisée est **GitHub Actions → CKai - APK Android**. Le workflow teste le moteur, extrait de vrais PDF/DOCX/XLSX hors ligne dans Chrome, contrôle TypeScript et les versions Expo, puis génère `CKai-test.apk` avec JavaScript embarqué. Un second job installe cet APK sur un émulateur Android pour contrôler l’ouverture, le profil persistant, les imports et les réglages. Les résultats de chaque exécution sont consultables dans Actions.

Télécharger l’artefact `CKai-Android-…`, extraire le ZIP et installer l’APK. Cette version utilise une signature de test et ne nécessite ni Expo Go ni serveur Metro.

Pour compiler localement : Node 24, JDK 17, Android SDK/NDK et accès npm requis.

```sh
npm run setup
npm run typecheck
npm run apk
```

`setup` sélectionne les dépendances natives du manifeste officiel Expo et prépare le lecteur de documents hors ligne. `test:reader` nécessite Google Chrome installé. Le profil EAS reste une configuration préparatoire : compte, projet, variables et génération du lecteur dans le cycle EAS sont à configurer et valider avant de l’utiliser. GitHub Actions est la voie effectivement utilisée ici.

## Clés

Sans clé au build, ajouter la clé Groq dans Réglages et tester la connexion. Pour préconfigurer un build personnel, définir `GROQ_API_KEY` dans les secrets Actions, ou dans `../.env.local` pour une compilation locale. Le script génère `_private/bootstrap.json`, exclu de Git. Une clé déjà présente sur le téléphone est conservée.

Une clé préconfigurée est extractible du paquet APK ; SecureStore protège sa copie locale, sans la retirer du paquet. Les builds personnels préconfigurés et leurs artefacts doivent donc rester privés. Le code public ne contient pas de clé.

Tavily est facultatif. Sa clé est saisie dans les réglages et reste dans SecureStore. La recherche Groq fonctionne avec la clé Groq, selon les possibilités et quotas du compte ; les résultats structurés Tavily permettent les cartes de sources détaillées.

## Fonctions ajoutées à 0.2

- Web automatique, forcé ou désactivé ; navigateur Groq, Tavily facultatif, sources vérifiables issues des outils, lecture de pages HTTPS.
- Menu + : PDF texte, DOCX, tableurs, CSV, texte/code, photos, caméra et vidéos. Extraction locale ; aucune conversion de documents confiée à un serveur CKai.
- Vision Groq configurable ; analyse de trois images échantillonnées d’une vidéo, avec mention de l’absence d’analyse audio. Lecteur vidéo natif monté à la demande.
- Images dans le Markdown, recherche Wikimedia créditée, agrandissement, partage ; fichiers texte et PDF générés ; météo Open-Meteo.
- Animations d’entrée, orbe Skia, shimmer, bordure animée, dévoilement progressif des lettres avec flou ; réduction des animations système et dans l’app.
- Markdown incrémental, contexte jusqu’à 32 000 caractères, résumé des anciens échanges, extraits documentaires locaux, mémoire consultable/modifiable/supprimable.
- Lecture à voix haute, en plus des fonctions de chat/historique/arrêt/reprise déjà présentes.

## Validation et limites

35 tests automatisés du moteur et des fonctions partagées. Le workflow teste aussi l’extraction réelle de PDF/DOCX/XLSX, un PDF corrompu et un PDF sans texte. Le contrôle TypeScript et la compilation sont distincts du test sur émulateur, et les résultats doivent être lus pour l’exécution concernée.

La version 0.3 n’implémente pas encore tout le grand cahier des charges. Les limites, les étapes manuelles et les écarts restants sont dans [validation-v03.md](../docs/validation-v03.md). Les performances 60 fps et le démarrage sous 2 s demandent des mesures sur téléphone.
