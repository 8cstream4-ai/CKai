# Compiler CKai sur GitHub

Le dépôt `8cstream4-ai/CKai` est connecté. Les sources Android, le moteur IA et l’icône ont été transférés sur `main`.

## Compilation

Le workflow **CKai - APK Android** démarre lors des changements à l’application sur `main`, ou manuellement dans Actions. Il prépare Node, Java et Android, exécute les tests, installe les dépendances compatibles Expo, vérifie TypeScript puis compile un APK autonome avec son JavaScript intégré. Cette compilation Gradle ne nécessite pas de connexion Expo.

Une fois l’exécution réussie, télécharger l’artefact `CKai-Android-…`, extraire son ZIP et installer `CKai-test.apk`. L’artefact est conservé trois jours. Le lancement et la fluidité sur téléphone demandent encore une vérification manuelle.

## Groq

Sans secret de compilation, saisir la clé Groq dans les réglages de l’application ; elle est conservée dans SecureStore.

Pour un build personnel préconfiguré, ajouter le secret `GROQ_API_KEY` dans Settings → Secrets and variables → Actions. Le workflow teste alors une vraie réponse Groq avant de compiler, puis prépare la configuration embarquée. Une clé embarquée reste extractible de l’APK : conserver le dépôt et les artefacts privés pour ce mode.

Le connecteur GitHub utilisé pour transférer le code ne permet pas de définir les secrets Actions. Aucun identifiant Expo ni fichier `.env.local` n’a été transféré.

## Vérification manuelle

1. Installer l’APK et créer le profil local.
2. Dans Réglages, renseigner et tester la clé si elle n’était pas fournie au build.
3. Envoyer une question, vérifier le streaming et arrêter une réponse.
4. Fermer puis rouvrir l’application et retrouver la conversation.
5. Vérifier les thèmes et la navigation sur le téléphone.

La réussite des tests du moteur ne remplace pas cette vérification Android.
