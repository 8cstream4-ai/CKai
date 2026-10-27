import type { Locale } from './types.ts';

export class AIError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryMs: number;
  constructor(code: string, retryable = false, retryMs = 0) {
    // Never pass upstream error bodies, headers or URLs into an error message.
    super(code);
    this.name = 'AIError';
    this.code = code;
    this.retryable = retryable;
    this.retryMs = retryMs;
  }
}

export function httpError(response: Response): AIError {
  const status = response.status;
  const retry = response.headers.get('retry-after');
  const wait = retry && /^\d+(\.\d+)?$/.test(retry)
    ? Number(retry) * 1000 : retry ? Math.max(0, Date.parse(retry) - Date.now()) : 0;
  const code = status === 401 ? 'invalid-key' : status === 403 ? 'forbidden'
    : status === 402 ? 'quota' : status === 429 ? 'rate-limit'
    : status === 404 ? 'model-unavailable' : status >= 500 ? 'server' : 'request';
  return new AIError(code, status === 429 || status >= 500, Number.isFinite(wait) ? wait : 0);
}

const messages = {
  fr: {
    'invalid-key': 'Clé API absente ou invalide. Vérifie le fournisseur dans les réglages.',
    forbidden: 'Accès refusé : vérifie les autorisations du compte et du modèle.',
    quota: 'Crédit ou quota épuisé. Aucun passage automatique vers une offre payante.',
    'rate-limit': 'Limite de débit atteinte. Réessaie plus tard ou choisis un niveau inférieur.',
    'model-unavailable': 'Modèle indisponible. Actualise la liste des modèles.',
    server: 'Le fournisseur est temporairement indisponible.',
    network: 'Connexion impossible. Vérifie ton accès réseau.',
    timeout: 'Le fournisseur a mis trop de temps à répondre. Tu peux réessayer.',
    protocol: 'Réponse incomplète ou invalide du fournisseur. Le texte reçu est conservé.',
    configuration: 'Configuration du fournisseur ou des messages invalide.',
    'paid-model': 'Ce modèle est bloqué en mode gratuit. Choisis openrouter/free ou un modèle :free.',
    'unsupported-effort': 'Ce modèle ne permet pas de désactiver la réflexion. Choisis Courte ou un autre modèle.',
    request: 'Requête refusée. Vérifie les capacités du modèle et les paramètres.',
  },
  en: {
    'invalid-key': 'Missing or invalid API key. Check provider settings.',
    forbidden: 'Access denied. Check account and model permissions.',
    quota: 'Credit or quota exhausted. No automatic switch to paid service.',
    'rate-limit': 'Rate limit reached. Try later or choose a lower level.',
    'model-unavailable': 'Model unavailable. Refresh the model list.',
    server: 'The provider is temporarily unavailable.',
    network: 'Connection failed. Check your network.',
    timeout: 'The provider took too long to respond. You can retry.',
    protocol: 'Incomplete or invalid provider response. Received text is preserved.',
    configuration: 'Invalid provider configuration or messages.',
    'paid-model': 'Model blocked in free mode. Choose openrouter/free or a :free model.',
    'unsupported-effort': 'This model cannot disable reasoning. Choose Short or another model.',
    request: 'Request rejected. Check model capabilities and settings.',
  },
};

export function publicError(error: unknown, locale: Locale) {
  const code = error instanceof AIError ? error.code : 'network';
  const dict: Record<string, string> = messages[locale];
  return { code, message: dict[code] ?? dict['request']!, suggestLowerLevel: code === 'rate-limit' };
}
