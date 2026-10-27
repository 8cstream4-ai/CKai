# Architecture CKai 0.3

```text
Expo Router / FlashList / interface native
       │
RuntimeProvider ── SQLite : messages, pièces jointes, souvenirs, résumés, brouillons
       │                     │
       │              fichiers privés du téléphone
       │
       ├── ChatTransport REST SSE ── Groq GPT-OSS
       ├── préparation visuelle ── Groq Vision
       ├── lecteur de documents ── WebView isolée hors ligne
       └── outils : Web, météo, images, fichiers, mémoire, date

SecureStore : clés Groq et Tavily
```

## Moteur et outils

Le moteur partagé `src/ai` reste indépendant de React et SQLite. `types.ts` définit `ChatRequest`, `ChatEvent`, `Tool` et `SecretStore`. Le transport REST compatible OpenAI assemble les SSE, gère l’annulation et limite la boucle à huit appels au modèle. Il n’utilise pas encore le SDK Vercel AI.

Les retries réseau/429/5xx ont lieu avant lecture du flux. Une coupure après réception de texte conserve la partie reçue. Les sorties d’outils sont bornées, les arguments sont contrôlés et les outils ont des délais d’attente. Les raisonnements privés du modèle ne sont pas affichés ; la timeline montre uniquement les opérations observées et leurs durées.

`research.ts` contient la recherche Groq Browser Search et Tavily facultatif, la normalisation des sources et les outils Web/Open-Meteo/Wikimedia. Les numéros de citations correspondent aux métadonnées réellement retournées. Un lien rédigé par le modèle ne devient pas automatiquement une source vérifiée.

## Stockage et contexte

`mobile/src/storage.ts` ouvre SQLite en WAL et applique la migration du schéma 1 vers 2 sans effacer les conversations. Les parties riches sont sérialisées à côté du texte. Le streaming est rendu à environ 40 ms et sauvegardé environ toutes les 400 ms ; les réponses non terminées sont marquées interrompues au redémarrage.

Le runtime prépare le contexte à partir des derniers messages, des résumés disponibles, de la mémoire activée et d’extraits documentaires sélectionnés localement. Cette recherche d’extraits est lexicale ; elle ne constitue pas un index d’embeddings. Les analyses visuelles sont conservées avec le message pour les échanges suivants.

Les images sont compressées et transmises au modèle Vision. Les vidéos restent locales ; trois images sont échantillonnées puis analysées. Cette analyse ne couvre pas toute la vidéo ni sa piste audio.

## Lecteur de documents

PDF.js, Mammoth et SheetJS sont regroupés dans une page générée lors du setup. La WebView ne peut pas accéder au réseau ou aux fichiers locaux ; les données bornées lui sont fournies en mémoire. Elle retourne uniquement du texte et des métadonnées. Le contenu HTML des documents n’est pas exécuté. Le lecteur distingue un PDF texte, un PDF corrompu et un PDF sans texte extractible.

## Rendu et animations

FlashList virtualise les messages. Les anciens messages conservent leurs références et leurs callbacks lors du streaming. `MarkdownStreamParser` garde les blocs terminés et ne reparcourt que la fin ouverte. Le nombre de lettres animées est borné à la fin du bloc actif. Reanimated anime sur le thread UI ; l’orbe utilise Skia. Les options de réduction des animations sont respectées.

Les vidéos sont montées à la demande dans un seul lecteur et mises en pause en arrière-plan. Les médias sont entourés de barrières d’erreur.

## Flux réseau

Aucun serveur CKai et aucun analytics. Les requêtes partent vers Groq ; si la recherche et les outils sont utilisés, vers Tavily, les pages consultées, Wikimedia ou Open-Meteo selon l’action. Le lecteur de documents reste hors ligne. Les secrets ne sont pas ajoutés aux conversations ou au dépôt. Une clé volontairement préconfigurée dans un build reste extractible de cet APK.

Le chiffrement SQLCipher, les projets, les comptes locaux multiples, le verrouillage et les sauvegardes chiffrées restent à implémenter. Voir `validation-v03.md` pour les écarts fonctionnels restants.
