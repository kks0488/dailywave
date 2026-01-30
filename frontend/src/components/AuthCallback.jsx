import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function getOAuthErrorFromLocation() {
  const url = new URL(window.location.href);
  const error = url.searchParams.get('error') || '';
  const errorDescription = url.searchParams.get('error_description') || '';
  const errorCode = url.searchParams.get('error_code') || '';
  const message = errorDescription || error;
  return message ? { message, errorCode } : null;
}

function getCodeFromLocation() {
  const url = new URL(window.location.href);
  return url.searchParams.get('code') || '';
}

const AuthCallback = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [error, setError] = useState('');

  const code = useMemo(() => getCodeFromLocation(), []);
  const oauthError = useMemo(() => getOAuthErrorFromLocation(), []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setStatus('error');
      setError('Supabase is not configured.');
      return;
    }

    if (oauthError?.message) {
      setStatus('error');
      setError(oauthError.errorCode ? `${oauthError.message} (${oauthError.errorCode})` : oauthError.message);
      return;
    }

    if (!code) {
      // Support implicit flow / hash-based sessions when available.
      (async () => {
        try {
          if (typeof supabase.auth.getSessionFromUrl === 'function') {
            const { data, error: sessionError } = await supabase.auth.getSessionFromUrl({
              storeSession: true,
            });
            if (sessionError) throw sessionError;
            if (!data?.session) throw new Error('Missing OAuth session.');
          } else {
            const { data, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!data?.session) throw new Error('Missing OAuth code.');
          }
          setStatus('ok');
          window.location.replace('/');
        } catch (e) {
          setStatus('error');
          setError(e?.message || 'Auth callback failed.');
        }
      })();
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
  }, [code, oauthError?.errorCode, oauthError?.message]);

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
