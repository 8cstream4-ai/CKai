# Architecture du moteur IA

```text
Future interface CKai / CLI
             │ ChatRequest / ChatEvent
             ▼
        ChatTransport
             │
      transport REST SSE ─────► fournisseur choisi
             │                         │
     boucle d’agent bornée ◄─────────────┘
             │
       outils injectés

SecretStore ─► SecureStore par profil sur téléphone
            └► variables locales pour la CLI uniquement
```

`src/ai/types.ts` définit le contrat public. Le moteur ne connaît ni React, ni SQLite, ni l’interface. `src/ai/providers.ts` regroupe endpoints, modèles et routage local Auto. `transport.ts` gère authentification, streaming, annulation, requêtes et outils. `sse.ts` assemble les octets indépendamment du rendu. `errors.ts` traduit les erreurs sans exposer de corps réseau. `src/lib/secrets.ts` adapte les trois opérations SecureStore documentées.

Les requêtes sortent seulement vers le fournisseur sélectionné. Il n’y a pas de serveur CKai, d’analytics, de révocation, de basculement inter-fournisseurs, de mémoire ou d’outil réseau implicite. Le texte et les résultats d’outils ne sont conservés qu’en mémoire dans ce module. Les messages de l’appelant ne sont pas mutés. Une future couche SQLite pourra persister les événements sans y mettre les clés.

Le budget s’applique à chaque appel au modèle, réflexion comprise selon le fournisseur. Huit étapes maximum, dont sept pouvant déclencher des outils ; le dernier appel est arrêté s’il demande encore un outil. Une étape admet au maximum huit outils parallèles. Un outil reçoit un signal d’annulation et doit valider ses arguments. Une sortie d’outil trop volumineuse est remplacée par une erreur structurée. Les erreurs d’outils ne révèlent pas leur exception brute au modèle.

Le timeout réseau couvre une étape entière, retries et flux inclus. Les retries réseau/429/5xx n’existent qu’avant lecture du flux ; une erreur pendant le streaming conserve le texte et rend la main. `Retry-After` est respecté ; une attente supérieure à 30 secondes est rendue à l’interface sous forme d’erreur. Un arrêt utilisateur émet `done.cancelled`. Fermer l’itérateur nettoie le lecteur SSE et les contrôleurs associés.

La timeline peut afficher connexion, réponse et appels d’outils réels. Les champs de raisonnement privés renvoyés par les fournisseurs sont ignorés. La durée d’outil est mesurée ; aucune durée de réflexion n’est inventée.

Le transport SDK Vercel reste à implémenter et à valider lorsque npm sera accessible. Cette frontière permet de le remplacer sans changer le contrat de l’interface, des clés et des erreurs. L’intégration Expo nécessitera aussi une validation de TextDecoder, des streams, d’AbortSignal et des options de fetch sur la version stable retenue ; les tests Node ne constituent pas une validation Android.
