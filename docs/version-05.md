# CKai 0.5.1 — réponses en arrière-plan et médias

La version 0.4.1 de l’accueil reste disponible dans [son rapport](accueil-04.md). Cette livraison ajoute les fonctions demandées ensuite : continuer une réponse en changeant d’application, recevoir sa notification et retrouver de vrais médias dans le chat.

## Fonctionnement

### Génération et notifications Android

- Un module Expo local lance un foreground service Android de type dataSync. Sa notification permet d’ouvrir la conversation ou d’arrêter la requête.
- Une tâche Headless JS maintient le moteur et ses minuteries lorsque l’activité est en arrière-plan. Le moteur de conversation est un singleton externe à React ; quitter l’écran ne l’annule plus. React ne reçoit les changements de ce moteur que lorsque l’application est active.
- Les écritures SQLite restent sérialisées. La notification de fin est envoyée après la dernière sauvegarde et son lien ouvre l’identifiant de la bonne conversation.
- Le service se termine à la fin ou à l’arrêt de la réponse. Une limite locale de dix minutes borne son activité ; une requête inconnue après destruction du processus n’est jamais relancée automatiquement.
- Le réglage « Continuer quand je change d’application » est activé par défaut. Android 13+ demande l’autorisation des notifications. Le bouton « Tester les notifications » effectue un test local de dix secondes, sans requête ni crédit IA.
- Aucun serveur CKai ni service de push distant n’est ajouté. Un arrêt forcé ou une destruction du processus par Android peut interrompre la réponse ; ce mécanisme local ne promet pas de survivre à ces actions.

### Recherche d’images et de vidéos

Une demande explicite de visuel impose le véritable outil au premier tour du modèle ; les tours suivants redeviennent libres pour permettre la réponse finale. Une photo jointe à identifier ne force pas une recherche de nouvelles images.

Les images proviennent de Wikimedia Commons et de l’API PageImages de Wikipedia FR/EN. Une illustration encyclopédique correspondant au sujet est prioritaire, puis les résultats Commons complètent la sélection. Les URL, titres et crédits sont issus des réponses API, jamais d’une liste de liens inventée par le modèle. Les illustrations Wikipedia ne sont pas présentées comme systématiquement libres de droits : la carte renvoie vers la source et les conditions indiquées.

Les vidéos utilisent l’API videoinfo de Commons : le lecteur privilégie une dérivée MP4/WebM adaptée plutôt qu’un original OGV non pris en charge. Chaque média conserve sa source et son attribution.

Les galeries précèdent l’explication, avec un texte court pour les réponses contenant des médias. Leurs métadonnées rejoignent le contexte des échanges suivants. Les images peuvent être agrandies et partagées ; les échecs de chargement proposent de réessayer. Les composants médias sont mémorisés pour éviter leur reconstruction à chaque fragment de texte.

### Photos et vidéos importées

Les fichiers choisis sont copiés dans le stockage de CKai, conservés dans le message et restent accessibles après relance. Trois pièces jointes au maximum par message : photos jusqu’à 25 Mo, vidéos jusqu’à 80 Mo, documents jusqu’à 12 Mo.

Les images passent par le modèle Vision Groq configuré. Pour une vidéo, trois images au maximum sont analysées ; le son n’est pas transcrit. Cette limite est affichée sur sa carte et ajoutée au contexte du modèle. Le lecteur lit la vidéo complète, ce qui est distinct de cette analyse IA partielle.

Le lecteur est monté seulement à son ouverture, un seul à la fois. Il se met en pause en arrière-plan, sauf PiP choisi explicitement. Le PiP est déclaré dans la configuration native. Les écrans plein écran conservent des contrôles blancs sur fond sombre, y compris avec le thème clair ; un format non lisible propose sa source ou le partage vers une autre application.

### Clavier et interface

Keyboard Controller, dans la version compatible du SDK Expo installé, remplace l’évitement du clavier absent sur Android. La mesure automatique des décalages tient compte des en-têtes. Le clavier n’est pas préchargé à l’ouverture, pour éviter son apparition fugitive.

L’accueil adapte ses marges, son orbe et ses cartes aux écrans courts. Le décor s’arrête également quand l’écran du chat perd le focus. Les garanties et limites de performance physique restent celles du rapport accueil : 60 fps ne sont pas certifiés sur un téléphone non attaché à cette session.

## Livraison et contrôles

- [APK 0.5.1 — ZIP à extraire](https://github.com/8cstream4-ai/CKai/actions/runs/40690635044/artifacts/12816874969). Installer `CKai-test.apk` sans désinstaller CKai. Package et certificat identiques à 0.4.1, versionCode 5 → 7 ; l’APK 0.5.0 est remplacé.
- [Captures avant/après et vidéos écran](https://github.com/8cstream4-ai/CKai/actions/runs/40694433346/artifacts/12817948762) : accueil à 360/393/430 dp, sombre/clair/AMOLED, police 100/130 %, paysage, Markdown, imports et lecteurs photo/vidéo. Les profils et médias de démonstration sont synthétiques.
- [Captures lisibles des notifications, extraites du même enregistrement réussi](https://github.com/8cstream4-ai/CKai/actions/runs/40695726048/artifacts/12819277071) : notification en cours avec action Arrêter, notification terminée, puis ouverture de la conversation. Les captures instantanées 08/09 du premier ZIP étaient prises pendant le dessin du volet ; ces images du film montrent son état effectivement affiché.
- [113 tests, lint et types moteur/natifs](https://github.com/8cstream4-ai/CKai/actions/runs/40690634981) : réussis. Cinq contrôles de lecture réelle de PDF, DOCX et tableurs hors ligne : réussis.
- [Compilation du module Kotlin et du manifeste](https://github.com/8cstream4-ai/CKai/actions/runs/40690635008) : réussie.
- [Parcours Android sur le véritable APK 0.5.1](https://github.com/8cstream4-ai/CKai/actions/runs/40690635044) : lancement, profil persistant, photo importée et agrandie, vidéo MP4 importée et lue, service Headless actif en arrière-plan, notification de fin, ouverture de la bonne conversation et arrêt du service depuis la notification : réussis. Le composer reste visible au-dessus du clavier ; les PNG ont été inspectés.
- [Recherche HTTP réelle sans clé IA](https://github.com/8cstream4-ai/CKai/actions/runs/40680750725) : six images pour « Monkey D. Luffy » et quatre vidéos pour « waterfall ». Ce contrôle vérifie les fournisseurs de médias, pas un échange Groq.
- Vidéos vérifiées par FFprobe : accueil avant 14,46 s, accueil après 17,13 s et test en arrière-plan 30,60 s.
- Réduction du mouvement et économie de batterie : ratio de pixels modifiés **0,0** dans les régions de décor contrôlées. Les 60 fps physiques ne sont pas validés : l’émulateur SwiftShader relève 100 % de frames en retard et une médiane de 350 ms ; ces mesures sous rendu logiciel ne prouvent pas les performances sur téléphone.

Le compte de test ne contient aucune clé. Le test de notification utilise le même service/tâche Headless que la génération, avec un minuteur local explicitement nommé : aucune réponse de fournisseur n’est simulée ni présentée comme une génération Groq réelle. **L’analyse Vision réelle et une génération Groq en arrière-plan restent à vérifier sur le téléphone avec sa clé.** La caméra, le PiP physique, les variantes de sélecteur système et les restrictions batterie propres au constructeur restent aussi des contrôles sur l’appareil.

L’inspection du premier APK 0.5.0 avait révélé un retour `ComponentName` non sérialisable par Expo au démarrage du service. La version livrée retourne `Unit`, et le parcours complet ci-dessus a été rejoué sur 0.5.1. Le journal Android contient également une exception récupérée du processus d’automatisation `CKaiDump` pendant une transition sans fenêtre accessible ; elle ne provient pas du processus CKai.

## Vérification manuelle sur le téléphone

1. Installer la mise à jour par-dessus CKai, sans désinstaller ; vérifier profil, historique et clé conservés.
2. Dans les réglages, tester les notifications, passer à une autre application et toucher la notification terminée.
3. Lancer une réponse assez longue avec la clé existante, changer d’application, puis vérifier la notification et le texte complet dans la conversation.
4. Répéter et utiliser Arrêter dans la notification : le texte reçu doit rester sauvegardé.
5. Importer une photo et une vidéo, les envoyer, ouvrir les lecteurs puis relancer l’application ; vérifier aussi l’analyse visuelle réelle avec Groq.
6. Demander une image de Luffy et une vidéo de cascade : vérifier les cartes, les sources et les liens, plutôt qu’un tableau sans média.
7. Tester le clavier, le thème clair, la taille de police et le PiP sur l’appareil ; la caméra et les variantes de sélecteur système restent des contrôles physiques.

## Sources techniques consultées

- [Headless JS, React Native 0.88](https://reactnative.dev/docs/headless-js-android)
- [Permissions Android](https://reactnative.dev/docs/permissionsandroid)
- [Foreground service dataSync](https://developer.android.com/develop/background-work/services/fgs/service-types#data-sync)
- [Modules Expo locaux](https://docs.expo.dev/modules/get-started/)
- [Keyboard Controller pour Expo](https://docs.expo.dev/versions/latest/sdk/keyboard-controller/)
- [KeyboardAvoidingView et mesure automatique](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-avoiding-view)
- [Expo Video et configuration PiP](https://docs.expo.dev/versions/latest/sdk/video/)
- [MediaWiki PageImages](https://www.mediawiki.org/wiki/Extension:PageImages)
- [MediaWiki videoinfo](https://www.mediawiki.org/wiki/Extension:TimedMediaHandler/API)
- [Groq : choix explicite d’un outil](https://console.groq.com/docs/tool-use/local-tool-calling)
- [Groq : Vision](https://console.groq.com/docs/vision)
