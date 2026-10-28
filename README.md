# CKai

Assistant IA Android en français : interface sombre, claire et AMOLED, historique SQLite, réponses en streaming Groq, sélecteur de modèle, arrêt et régénération, Markdown et clé conservée dans SecureStore.

## État réel

La suite comporte 113 tests automatisés, dont 50 fixtures Markdown françaises exercées en streaming. La version 0.5.0 ajoute un service Android pour continuer les réponses en arrière-plan, des notifications avec arrêt et ouverture du chat, de vraies galeries avec sources, un lecteur vidéo et un composer qui suit le clavier ; voir [le rapport de version](docs/version-05.md). La version 0.4.1 refait l’accueil : orbe et fond Skia, nom en dégradé, cartes en verre et composer lumineux. L’APK et les preuves sont dans [le rapport accueil](docs/accueil-04.md). Les 60 fps sur téléphone physique restent à mesurer. La version 0.3 ajoute la recherche web, les sources, les imports PDF/DOCX/tableurs/images/vidéos, les animations, la météo et la mémoire. Les limites et vérifications manuelles sont détaillées dans `docs/validation-v03.md`. Le grand cahier des charges reste partiellement implémenté.

## Télécharger le test Android

La version 0.5.1 est en cours de compilation. Le test réel 0.5.0 a validé les médias et le clavier, mais a trouvé un retour natif incompatible au démarrage des notifications ; cette erreur est corrigée dans 0.5.1. Attendre le lien 0.5.1 du rapport avant de tester l’arrière-plan. Pour un nouveau build, ouvrir **Actions → CKai - APK Android** et télécharger l’artefact `CKai-Android-…` après une compilation réussie. Extraire le ZIP et installer `CKai-test.apk` sans désinstaller l’application existante.

Groq est intégré. Sans clé fournie au build, ajouter sa clé dans les réglages de l’application. Pour préconfigurer un build personnel, définir le secret Actions `GROQ_API_KEY`. Une clé intégrée à un APK reste extractible : conserver le dépôt et les artefacts privés pour ce mode.

## Développement

Node 24, JDK 17 et Android SDK requis.

```sh
npm test
npm run lint
cd mobile
npm run setup
npm run typecheck
npm run apk
```

Le script de configuration sélectionne les versions natives dans le manifeste officiel du SDK Expo installé. Les dépendances ne sont pas encore verrouillées ; voir `mobile/README.md` et `docs/architecture.md`.

Copier `.env.example` vers `.env.local` pour les outils locaux. Les clés, identifiants et fichiers privés sont exclus de Git.
