# CKai

Assistant IA Android en français : interface sombre, claire et AMOLED, historique SQLite, réponses en streaming Groq, sélecteur de modèle, arrêt et régénération, Markdown et clé conservée dans SecureStore.

## État réel

La suite comporte 113 tests automatisés, dont 50 fixtures Markdown françaises exercées en streaming. La version 0.5.1 ajoute un service Android pour continuer les réponses en arrière-plan, des notifications avec arrêt et ouverture du chat, de vraies galeries avec sources, un lecteur vidéo et un composer qui suit le clavier ; voir [le rapport de version](docs/version-05.md). La version 0.4.1 refait l’accueil : orbe et fond Skia, nom en dégradé, cartes en verre et composer lumineux. L’APK et les preuves sont dans [le rapport accueil](docs/accueil-04.md). Les 60 fps sur téléphone physique restent à mesurer. La version 0.3 ajoute la recherche web, les sources, les imports PDF/DOCX/tableurs/images/vidéos, les animations, la météo et la mémoire. Les limites et vérifications manuelles sont détaillées dans `docs/validation-v03.md`. Le grand cahier des charges reste partiellement implémenté.

## Télécharger le test Android

[Télécharger le ZIP APK 0.5.1](https://github.com/8cstream4-ai/CKai/actions/runs/40690635044/artifacts/12816874969). Extraire le ZIP puis installer `CKai-test.apk` par-dessus CKai, sans désinstaller : même package et certificat Android, versionCode 7. Cet APK embarque son JavaScript et fonctionne sans Expo Go. Le parcours Android complet passe. [Captures et vidéos avant/après](https://github.com/8cstream4-ai/CKai/actions/runs/40694433346/artifacts/12817948762), [notifications visibles](https://github.com/8cstream4-ai/CKai/actions/runs/40695726048/artifacts/12819277071) et [rapport de validation](docs/version-05.md). Le test de notification est local et sans clé IA ; les vraies requêtes Groq/Vision restent à vérifier avec la clé sur le téléphone.

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
