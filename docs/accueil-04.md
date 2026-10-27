# Accueil CKai 0.4 — demande ciblée

Le propriétaire a recentré la demande sur l’accueil. Les modèles supplémentaires, le routeur de quotas, la génération d’images et le reste du grand PDF ne sont pas inclus dans cette livraison. Le correctif Markdown déjà validé reste conservé.

## Implémentation

- Orbe : shader Skia original avec bandes aurore animées, éclairage blanc en haut à gauche, contour lumineux, C et étincelle. Respiration de 1 à 1,04 en quatre secondes et petite pulsation liée à la longueur du brouillon.
- Fond : blobs et grain procéduraux, étoiles Skia, mises à jour plafonnées à 30 fps et résolution réduite pour contenir le coût GPU. Arrêt complet du décor en économie de batterie ; animations suspendues en arrière-plan.
- Titre : nom masqué par un dégradé aurore, mots en fondu et flou progressif, décalage de 18 ms. Typographie Inter/Newsreader embarquée. Couleurs secondaires plus contrastées, adaptées aux trois thèmes.
- Cartes : flou natif Android 12+ avec cible de flou explicite, teinte translucide sur les versions antérieures ; contour actif, ressort à 0,97, haptique et entrée en cascade de 60 ms.
- Composer : bordure en dégradé au focus/génération, surface lumineuse du bouton dès qu’un brouillon existe, transition animée entre flèche et carré Stop. Le bouton conserve sa zone tactile de 48 dp.
- Header : mini-orbe avec C, grille d’espacements de 4 dp, contenu de conversation conservé lorsqu’un chat est ouvert.

Les animations continues s’exécutent sur le thread UI. Le fond seul est plafonné à 30 fps ; l’interface vise 60 fps. Le respect réel de 60 fps dépend de l’appareil : les mesures sur émulateur ne constituent pas une certification sur le téléphone du propriétaire.

## Preuves et contrôle

Le workflow Android installe le vrai APK, vérifie les parcours existants, capture trois largeurs, les thèmes, le texte agrandi, le paysage, le focus et un appui. Il filme l’ouverture et la frappe. Des captures espacées vérifient que les mouvements continus s’arrêtent avec les animations réduites puis en économie de batterie. Les données sont synthétiques ; aucune clé ou conversation réelle n’entre dans les preuves.

Le workflow « Preuves accueil avant apres » réunit les images et vidéos de l’APK 0.3 et du nouvel APK. Les captures brutes sont aussi publiées en Base64 sur la branche `ckai-visual-proofs` pour inspection avec le connecteur GitHub. Les résultats et liens définitifs seront ajoutés après la fin des vérifications.

## Références consultées

- Apple Human Interface Guidelines, Motion : https://developer.apple.com/design/human-interface-guidelines/motion
- Material 3 Motion : https://m3.material.io/styles/motion/overview/how-it-works
- Prévisualisation publique du kit Figma Appetite UI, chat IA : https://www.appetiteui.com/screens/ai-chat/chat
- Skia RuntimeEffect : https://wcandillon.github.io/react-native-skia/v2/docs/shaders/overview/
- Expo Blur : https://docs.expo.dev/versions/latest/sdk/blur-view/
- Expo Battery : https://docs.expo.dev/versions/latest/sdk/battery/

Les références servent aux principes de mise en page et de mouvement. Aucun fichier de kit, asset Rive ou animation Lottie externe n’a été copié ; les effets et shaders CKai sont écrits pour l’application.
