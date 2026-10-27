# CKai

Assistant IA Android en français : interface sombre, claire et AMOLED, historique SQLite, réponses en streaming Groq, sélecteur de modèle, arrêt et régénération, Markdown et clé conservée dans SecureStore.

## État réel

Le moteur IA dispose de 35 tests automatisés. La compilation Android est lancée par GitHub Actions ; la validation sur un téléphone reste à effectuer. La version 0.3 ajoute la recherche web, les sources, les imports PDF/DOCX/tableurs/images/vidéos, les animations, la météo et la mémoire. Les limites et vérifications manuelles sont détaillées dans `docs/validation-v03.md`. Le grand cahier des charges reste partiellement implémenté.

## Télécharger le test Android

Ouvrir **Actions → CKai - APK Android → dernière exécution réussie**, puis télécharger l’artefact `CKai-Android-…`. Extraire le ZIP et installer `CKai-test.apk`. Cet APK de test embarque le JavaScript et ne nécessite pas Expo Go.

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
