# Accueil CKai 0.4.1 — demande ciblée

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

Le workflow « Preuves accueil avant apres » réunit les images et vidéos de l’APK 0.3 et du nouvel APK. Les captures brutes sont aussi publiées en Base64 sur la branche `ckai-visual-proofs` pour inspection avec le connecteur GitHub. Les résultats et liens définitifs figurent ci-dessous.

## Références consultées

- Apple Human Interface Guidelines, Motion : https://developer.apple.com/design/human-interface-guidelines/motion
- Material 3 Motion : https://m3.material.io/styles/motion/overview/how-it-works
- Prévisualisation publique du kit Figma Appetite UI, chat IA : https://www.appetiteui.com/screens/ai-chat/chat
- Skia RuntimeEffect : https://wcandillon.github.io/react-native-skia/v2/docs/shaders/overview/
- Expo Blur : https://docs.expo.dev/versions/latest/sdk/blur-view/
- Expo Battery : https://docs.expo.dev/versions/latest/sdk/battery/

Les références servent aux principes de mise en page et de mouvement. Aucun fichier de kit, asset Rive ou animation Lottie externe n’a été copié ; les effets et shaders CKai sont écrits pour l’application.

## Livraison vérifiée le 28 octobre 2026

- [APK 0.4.1, versionCode 5](https://github.com/8cstream4-ai/CKai/actions/runs/40666397076/artifacts/12807178571), 43,6 Mo compressés. L’APK de test contient ARM64 pour le téléphone et x86_64 pour l’émulateur ; ARMv7/x86 32 bits ne sont pas inclus. Installer par-dessus la version existante, sans désinstaller.
- [Captures et vidéos avant/après](https://github.com/8cstream4-ai/CKai/actions/runs/40669790177/artifacts/12807673694), 15,8 Mo. Dossiers `before/` et `after/`, chacun avec `intro.mp4` et les PNG. Le dossier après inclut focus, appui, trois tailles/thèmes, texte agrandi, paysage et contrôles du mouvement.
- [Parcours Android final réussi](https://github.com/8cstream4-ai/CKai/actions/runs/40669790177) : lancement, profil persistant, accueil, imports, réglages, captures et vidéo. Compilation réelle du build 16 réussie ; contrôle visuel effectué dans une exécution distincte pour corriger l’outil de test sans recompiler l’application.
- [Tests, lint et types réussis](https://github.com/8cstream4-ai/CKai/actions/runs/40669790096) : 87 tests, types du moteur et natifs, lecture réelle PDF/DOCX/XLSX hors ligne.
- Mouvement réduit et économie de batterie : ratio de pixels modifiés **0,0** dans les deux contrôles, seuil maximal 0,005. Données synthétiques uniquement.

L’inspection des captures a détecté puis corrigé des cartes trop claires en thème sombre et une couture dans le shader de l’orbe. Les captures finales montrent ces corrections. Sur écran court ou avec police agrandie, l’accueil reste défilable.

### Limites mesurées

Aucun téléphone physique n’est attaché. Le rendu logiciel SwiftShader de l’émulateur est lent : le relevé final indique 341 images tardives sur 342 et une médiane GfxInfo de 400 ms ; le relevé avant indique 413/458 et 93 ms. Les systèmes/charges des émulateurs diffèrent et ce relevé inclut démarrage et interactions : il ne constitue pas un benchmark comparatif contrôlé ni une mesure des shaders sur GPU mobile. **Les 60 fps ne sont pas validés.** Une mesure sur le téléphone est requise avant de promettre cette cadence.

Le film et les captures ne déclenchent aucune requête fournisseur : le profil de test n’a pas de clé. La transition Envoyer/Stop est reliée au flux réel ; elle doit être vérifiée manuellement avec la clé du téléphone. Le flou natif des cartes utilise Android 12+ ; une teinte de repli existe sur les versions antérieures.

### Vérification sur téléphone

1. Installer `CKai-test.apk` après extraction du ZIP, sans supprimer l’application ; vérifier profil et historique.
2. Ouvrir une nouvelle conversation : observer l’orbe, le C, les étoiles et l’arrivée des cartes ; la respiration effectue un cycle en quatre secondes.
3. Saisir un brouillon et maintenir une carte : vérifier focus, bouton lumineux, pulsation, contour et haptique.
4. Envoyer avec la clé existante, puis arrêter : vérifier le carré Stop et la conservation du texte déjà reçu.
5. Activer les animations réduites puis l’économie de batterie ; vérifier l’arrêt des mouvements et la disparition du décor dans ce dernier mode.
