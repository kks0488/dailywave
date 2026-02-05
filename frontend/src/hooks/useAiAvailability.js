import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAiProxyStatus, hasApiKey } from '../lib/gemini';

export const DEFAULT_AI_PROXY_STATUS = {
  ai_proxy_reachable: false,
  gemini_configured: false,
  memu_reachable: false,
  require_supabase_auth_for_ai: false,
  rate_limits: { per_minute: 0, per_hour: 0 },
};

export const useAiAvailability = ({ user, isGuest }) => {
  const [aiProxyStatus, setAiProxyStatus] = useState(() => DEFAULT_AI_PROXY_STATUS);

  const hasLocalKey = hasApiKey();

  const canUseHostedAi = useMemo(
    () =>
      !!aiProxyStatus?.gemini_configured &&
      (!aiProxyStatus?.require_supabase_auth_for_ai || (!!user && !isGuest)),
    [aiProxyStatus, isGuest, user]
  );

  const aiEnabled = hasLocalKey || canUseHostedAi;
  const hostedNeedsLogin =
    !!aiProxyStatus?.gemini_configured &&
    !!aiProxyStatus?.require_supabase_auth_for_ai &&
    (!user || isGuest) &&
    !hasLocalKey;

  const refreshStatus = useCallback(async (force = false) => {
    try {
      const status = await getAiProxyStatus({ force });
      if (status && typeof status === 'object') {
        setAiProxyStatus(status);
      }
    } catch {
      // ignore status errors (frontend should gracefully fallback)
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAiProxyStatus()
      .then((status) => {
        if (cancelled) return;
        if (status && typeof status === 'object') {
          setAiProxyStatus(status);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    aiProxyStatus,
    hasLocalKey,
    canUseHostedAi,
    aiEnabled,
    hostedNeedsLogin,
    refreshStatus,
  };
};
