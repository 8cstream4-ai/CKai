# CKai 0.3 — contrôle des fonctions demandées

La version 0.2 était un chat minimal et ne remplissait pas le cahier des charges complet. La version 0.3 ajoute les parcours ci-dessous ; leur présence dans le code ne vaut pas validation sur téléphone.

## Recherche et sources

- Recherche Groq Browser Search avec GPT-OSS 120B et la clé Groq existante ; le navigateur est exécuté chez Groq. Mode automatique, forcé ou désactivé.
- Tavily facultatif dans SecureStore pour des résultats structurés. Citations numérotées et panneau de sources avec extraits.
- Les cartes de sources proviennent uniquement de métadonnées d’outils. Si Groq fournit seulement une synthèse textuelle et ses références internes, aucune carte de source n’est inventée.
- Lecture de pages HTTPS publiques, météo Open-Meteo, images Wikimedia avec crédits et licence.

## Fichiers, images et vidéos

- Menu + : documents, galerie, caméra et vidéos. Trois pièces jointes par message, miniatures supprimables et brouillon persistant.
- Extraction locale PDF.js, Mammoth et SheetJS dans une WebView sans accès réseau. PDF texte, DOCX, XLS/XLSX/ODS ; texte, CSV et code lus directement.
- Limites : documents 12 Mo / 200 000 caractères / 300 pages PDF, images 25 Mo, vidéos 80 Mo. Les limites d’extraction sont signalées. Les PDF scannés ne sont pas soumis à un faux OCR.
- Images compressées ; vision Groq Qwen 3.8 configurable. Une description visuelle rejoint le contexte de GPT-OSS.
- Vidéos : trois images échantillonnées au début, milieu et à la fin. Analyse visuelle partielle, sans audio ; le modèle est informé de cette limite. Lecteur natif monté seulement à la demande, un seul lecteur à la fois, pause en arrière-plan.
- Images dans les réponses Markdown, agrandissement et partage. Création réelle de TXT/MD/CSV/JSON/HTML/PDF et cartes de fichiers.

## Animations et contexte

- Entrée des éléments, orbe Skia, ligne d’activité avec shimmer, durées et panneau d’étapes réelles, bordure animée du composer.
- Dévoilement avec flou progressif des dernières lettres seulement ; nombre de glyphes animés borné. Markdown incrémental : seuls les blocs ouverts sont reparsés.
- Réglage animations réduites et respect du réglage système.
- Fenêtre glissante 32 000 caractères ; résumé des anciens messages ; sélection locale d’extraits documentaires en fonction de la question.
- Mémoire persistante avec outils et écran pour consulter, modifier, supprimer ou désactiver.

## Vérification manuelle sur téléphone

1. Installer le nouvel APK, conserver l’historique de 0.2 et tester la clé dans Réglages.
2. Forcer le Web avec le globe, demander une information récente, ouvrir les sources lorsqu’elles sont disponibles. Désactiver le Web et vérifier qu’aucune recherche n’est appelée.
3. Importer un PDF texte, un DOCX, un XLSX et un CSV ; poser une question sur un passage éloigné du début. Vérifier le message explicite pour un format ou une taille refusés.
4. Importer une image puis une courte vidéo ; vérifier l’analyse, la lecture, l’arrêt de la lecture en arrière-plan et les limites annoncées.
5. Demander des images de Wikimedia et la météo d’une ville. Demander un fichier CSV puis un PDF et les partager.
6. Observer les lettres et le composer pendant le streaming, puis activer les animations réduites. Vérifier Stop, Réessayer et le retour à l’historique.
7. Enregistrer un souvenir, l’éditer puis le supprimer. Désactiver la mémoire.

## Écarts restants du grand cahier des charges

Pas encore : génération d’images par un fournisseur dédié, vidéo/audio exhaustive, PDF scannés avec OCR multipage, export DOCX/XLSX/PPTX/ZIP, embeddings vectoriels, projets, chiffrement SQLCipher, comptes multiples et verrouillage PIN/biométrie, éditeur complet de thème, LaTeX/graphiques, dictée, export chiffré et couverture FR/EN complète. Les objectifs 60 fps et démarrage en moins de 2 secondes demandent des mesures sur appareil.

Les tests locaux couvrent 34 cas du moteur, des sources, du contexte documentaire et du Markdown incrémental. La compilation Android et l’essai sur téléphone sont des validations distinctes.
