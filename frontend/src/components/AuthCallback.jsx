import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function getCodeFromLocation() {
  const url = new URL(window.location.href);
  return url.searchParams.get('code') || '';
}

const AuthCallback = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [error, setError] = useState('');

  const code = useMemo(() => getCodeFromLocation(), []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setStatus('error');
      setError('Supabase is not configured.');
      return;
    }

    if (!code) {
      setStatus('error');
      setError('Missing OAuth code.');
      return;
    }

    (async () => {
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        setStatus('ok');
        window.location.replace('/');
      } catch (e) {
        setStatus('error');
        setError(e?.message || 'Auth callback failed.');
      }
    })();
  }, [code]);

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🌊</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
          {t('auth.signIn', 'Sign In')}
        </div>
        {status === 'loading' && (
          <div style={{ color: 'var(--text-secondary)' }}>{t('auth.callbackWorking', 'Completing sign-in...')}</div>
        )}
        {status === 'ok' && (
          <div style={{ color: 'var(--text-secondary)' }}>{t('auth.callbackDone', 'Signed in. Redirecting...')}</div>
        )}
        {status === 'error' && (
          <div style={{ color: 'var(--color-danger)' }}>
            {t('auth.callbackError', 'Sign-in failed')}: {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

