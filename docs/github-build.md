# Reprendre CKai avec GitHub

Le compte GitHub connecté a été confirmé par le connecteur : `8cstream4-ai`. Au moment de la vérification, aucun dépôt ni installation donnant accès aux dépôts n’était visible. Le connecteur disponible sait écrire des fichiers et des commits dans un dépôt existant, mais n’expose pas sa création ni l’ajout d’un secret Actions. L’accès réseau du terminal est toujours bloqué ; la commande `gh` ne peut pas remplacer ces opérations ici.

## Préparation nécessaire sur GitHub

1. Créer un dépôt **privé**, nommé `CKai`, avec un README pour initialiser sa branche.
2. Autoriser ce dépôt pour la connexion GitHub utilisée par Codex.
3. Transférer les fichiers du projet en excluant `.env.local`, `_private/`, les anciens aperçus et les sauvegardes. L’archive `CKai-pour-GitHub.zip` est préparée sans ces secrets et sorties.
4. Dans le dépôt, ouvrir Settings → Secrets and variables → Actions → New repository secret, puis ajouter `GROQ_API_KEY` avec la clé fournie. Le connecteur ne propose pas l’écriture de ce secret ; ne pas le mettre dans un fichier du dépôt.

Le transfert peut être fait par Codex dès que le dépôt est accessible. La création du dépôt et l’autorisation de son accès doivent passer par une capacité d’administration disponible ou par l’interface GitHub. Aucun mot de passe GitHub n’a été demandé ni supposé identique au mot de passe Expo.

## Compilation préparée

`.github/workflows/android-apk.yml` prépare Node, Java et le SDK Android sur un runner GitHub, exécute les tests, installe les dépendances Expo compatibles, valide une vraie réponse de Groq, prépare la clé pour ce build privé, effectue le typecheck puis compile un APK avec son JavaScript intégré. Aucun compte Expo n’est nécessaire pour **cette voie de compilation Gradle sur GitHub**.

Le workflow démarre sur un push à `main` concernant l’application, ou depuis Actions → CKai - APK Android prive → Run workflow. Il ne s’exécute que dans un dépôt privé, ne demande que `contents: read` et n’est pas déclenché par une pull request provenant d’un fork. Il consomme les minutes et le stockage Actions disponibles sur le compte ; aucun forfait payant n’est activé par le projet.

La clé reste un secret GitHub pendant la préparation, puis entre dans l’APK privé à la demande de l’utilisateur. Elle n’est pas ajoutée au dépôt. L’artefact APK est conservé trois jours sur GitHub. Les mises à jour de l’application utilisent, dans cette version de test, la signature issue du projet Android généré.

## État réel

La configuration et les scripts sont préparés localement. La syntaxe YAML, les tests du moteur et les contrôles locaux peuvent être vérifiés sans compte GitHub. **Aucun dépôt n’a encore été créé, aucun fichier transféré et aucun workflow exécuté.** Une compilation réussie devra encore être suivie d’un test d’installation et d’utilisation sur un appareil Android.
