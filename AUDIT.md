# CKai V2 — audit et suivi des corrections

Source : PDF utilisateur « CKai V2 — Prompt de correction pour Codex », 27 octobre 2026. Les données d’audit sont entièrement synthétiques ; les données et clés du téléphone de l’utilisateur ne sont pas consultées.

## Phase A — état initial

Le propriétaire confirme que l’APK 0.3 fonctionne sur son téléphone et signale un rendu Markdown irrégulier, des étoiles visibles, l’absence d’une véritable intro et un design insuffisant. Une nouvelle exécution de l’ancien APK sur émulateur capture trois largeurs (360/393/430 dp), trois thèmes, une police agrandie, le paysage et l’ouverture en vidéo. Les captures sont dans les artefacts Actions et la branche `ckai-visual-proofs`. Aucun téléphone physique n’est attaché à cette session : l’audit instrumenté physique et les mesures réelles 60 fps restent à effectuer.

| Défaut | Écran | Gravité | Cause observée dans le code | Correction prévue | État |
|---|---|---|---|---|---|
| Étoiles, italique et barré bruts | Réponse IA | Haute | Petit parser partiel, regex gras seulement, pas de normalisation | Pipeline Remend + AST Markdown/GFM, 40+ fixtures FR et tests des fragments | À corriger |
| Tableaux et syntaxe partielle visibles | Réponse IA | Haute | Absence de GFM et réparation des blocs | Tables natives horizontales, masquage des marqueurs incomplets | À corriger |
| Pas d’intro au démarrage à froid | Ouverture | Haute | Simple écran de chargement | Splash cohérent, animation 2,4 s passable/désactivable | À corriger |
| Hiérarchie, espacements et composer chargés | Chat/réglages | Haute | Composants peu hiérarchisés, tokens incomplets | Design system cohérent, panneaux et micro-interactions | À corriger |
| Quota bloque la conversation | Génération | Haute | Un seul fournisseur dans le runtime | Routeur gratuit borné, cooldowns, repli avant tout texte, clés guidées | À corriger |
| Catalogue de modèles figé | Réglages IA | Moyenne | Correspondance statique | Catalogues /models et choix par niveau | À corriger |
| Recherche sans cartes si Groq ne retourne pas les métadonnées | Recherche | Haute | Source opaque chez Groq | Recherche structurée, Wikipedia, cache, citations et Focus | À corriger |
| Génération d’images absente | Menu + | Haute | Aucun fournisseur image | Chaîne configurable Cloudflare/Pollinations/HF selon offres actuelles | À corriger |
| Vue plein écran contrastée en thème clair | Médias | Moyenne | Fond noir avec icônes du thème clair | Contraste indépendant dans les overlays | À corriger |
| Absence de preuves avant/après | Livraison | Haute | Uniquement smoke test basique jusqu’ici | Captures et vidéos reproductibles, APK, rapports | En cours |

## Recherche préalable des offres

Les quotas du PDF sont indicatifs. Pollinations exige actuellement une clé pour générer ; son ancien accès anonyme n’est pas présenté comme disponible. ChatGPT gratuit n’équivaut pas à une API OpenAI gratuite. Le routeur gratuit exclura OpenAI payant et les modèles OpenRouter non gratuits. Les comptes, conversations, mémoire, fichiers, thèmes et clés existants doivent rester conservés.

## Phase B — pipeline Markdown

Remend 1.4 (Apache-2.0) répare les délimiteurs ; Unified/Remark Parse/GFM/Math (MIT) produisent un AST rendu avec des composants natifs. Évaluation : Streamdown vise React DOM ; Remend est indépendant du DOM et convient au transport natif. Les parseurs natifs plus récents sont écartés au profit de ce pipeline stable et testable. Cinquante fixtures françaises couvrent les styles, listes imbriquées, tableaux, code, liens, images, citations, formules et fragments de 1 à 5 caractères. Le contenu du code est préservé. Les tests et types sont passés. Les captures de l’APK final sont disponibles dans le rapport accueil.

## Recentrage demandé : accueil uniquement

Le propriétaire a demandé de poursuivre uniquement la refonte visuelle de l’accueil. Les ajouts de fournisseurs, de routeur et de génération d’images du PDF sont donc reportés. La correction Markdown déjà terminée et passée aux tests est conservée. L’audit avant correction a réussi sur l’APK 0.3 (exécution 40599262618) ; la phase B a passé tests, lint, types du moteur et natifs et lecture réelle des documents (40599612009).

La livraison accueil ajoute un orbe RuntimeEffect Skia (bandes, reflet, contour, respiration 4 s, pulsation à la frappe, C et étincelle), un fond Skia plafonné à 30 fps avec grain/étoiles et arrêt en économie d’énergie, le nom en dégradé, les entrées mot par mot, les cartes en verre avec appui animé et haptique, le composer lumineux et le bouton animé envoyer/stop. La validation sur le nouvel APK et les preuves après correction restent à effectuer avant livraison.

## Livraison accueil 0.4.1

Compilation Android et contrôle visuel séparé réussis. [APK](https://github.com/8cstream4-ai/CKai/actions/runs/40666397076/artifacts/12807178571) · [Preuves avant/après avec vidéos](https://github.com/8cstream4-ai/CKai/actions/runs/40669790177/artifacts/12807673694) · [Rapport détaillé](docs/accueil-04.md). Inspection effective des PNG : couture de l’orbe et contraste des cartes corrigés. Réduction du mouvement et économie de batterie : aucun pixel modifié dans les régions contrôlées. Les 60 fps ne sont pas validés ; le rapport donne les relevés lents de l’émulateur logiciel et distingue cette limite d’un test physique.

Le propriétaire demande ensuite de poursuivre sur la génération en arrière-plan avec notification Android et les photos/vidéos réellement intégrées au chat. Ce nouveau travail n’est pas inclus dans l’APK 0.4.1.
