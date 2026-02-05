import { logger } from './logger';
import { useAuthStore } from '../store/useAuthStore';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
const AI_PROXY_STATUS_TTL_MS = 30_000;

const DEFAULT_AI_STATUS = {
  ai_proxy_reachable: false,
  gemini_configured: false,
  memu_reachable: false,
  require_supabase_auth_for_ai: false,
  rate_limits: { per_minute: 0, per_hour: 0 },
};

let _cachedAiProxyStatus = null;
let _cachedAiProxyStatusAt = 0;
let _aiProxyStatusInFlight = null;

export const resetAiClientCache = () => {
  _cachedAiProxyStatus = null;
  _cachedAiProxyStatusAt = 0;
  _aiProxyStatusInFlight = null;
};

const getBackendBaseUrl = (overrideBaseUrl = null) => {
  const raw = typeof overrideBaseUrl === 'string' ? overrideBaseUrl : BACKEND_BASE_URL;
  return typeof raw === 'string' ? raw.replace(/\/+$/, '') : '';
};

const getBackendAiUrl = (overrideBaseUrl = null) => {
  const base = getBackendBaseUrl(overrideBaseUrl);
  return base ? `${base}/api/ai/ask` : null;
};

const getBackendAiStatusUrl = (overrideBaseUrl = null) => {
  const base = getBackendBaseUrl(overrideBaseUrl);
  return base ? `${base}/api/ai/status` : null;
};

const getSupabaseAccessToken = () => {
  try {
    const session = useAuthStore?.getState?.()?.session;
    const token = session?.access_token;
    return typeof token === 'string' ? token : '';
  } catch {
    return '';
  }
};

const readErrorDetail = async (response) => {
  try {
    const error = await response.json();
    return error?.detail || error?.error?.message || error?.message || '';
  } catch {
    return '';
  }
};

export const getAiStatus = async (options = {}) => {
  const baseUrl = getBackendBaseUrl(options?.baseUrl ?? null);
  const statusUrl = getBackendAiStatusUrl(baseUrl);
  if (!statusUrl) {
    return DEFAULT_AI_STATUS;
  }

  const now = Date.now();
  if (
    _cachedAiProxyStatus &&
    _cachedAiProxyStatus.baseUrl === baseUrl &&
    now - _cachedAiProxyStatusAt < AI_PROXY_STATUS_TTL_MS &&
    !options?.force
  ) {
    return _cachedAiProxyStatus.value;
  }

  if (_aiProxyStatusInFlight) return _aiProxyStatusInFlight;

  _aiProxyStatusInFlight = fetch(statusUrl, { method: 'GET' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`AI status error: ${res.status}`);
      return await res.json();
    })
    .catch(() => DEFAULT_AI_STATUS)
    .then((value) => {
      _cachedAiProxyStatus = { baseUrl, value };
      _cachedAiProxyStatusAt = Date.now();
      return value;
    })
    .finally(() => {
      _aiProxyStatusInFlight = null;
    });

  return _aiProxyStatusInFlight;
};

export const askAi = async ({
  prompt,
  context = {},
  userId = null,
  systemPrompt = '',
  getLocalApiKey,
  baseUrl = null,
}) => {
  const backendAiUrl = getBackendAiUrl(baseUrl);
  if (backendAiUrl) {
    const apiSecretKey = import.meta.env.VITE_API_SECRET_KEY || '';
    const accessToken = getSupabaseAccessToken();
    const response = await fetch(backendAiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiSecretKey && { 'X-API-Key': apiSecretKey }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        prompt,
        context,
        system_prompt: systemPrompt,
        ...(userId && { user_id: userId }),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || '';
    }

    const localApiKey = typeof getLocalApiKey === 'function' ? getLocalApiKey() : '';
    if (!localApiKey) {
      const detail = await readErrorDetail(response);
      throw new Error(detail || `Backend AI error: ${response.status}`);
    }

    logger.warn('Backend AI rejected request; falling back to direct Gemini call.');
  }

  const apiKey = typeof getLocalApiKey === 'function' ? getLocalApiKey() : '';
  if (!apiKey) {
    throw new Error('API key not configured. Please set your Gemini API key in Settings.');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nContext: ${JSON.stringify(context)}\n\nUser request: ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.message || JSON.stringify(error);
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};
