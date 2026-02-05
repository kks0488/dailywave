import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCommandStore } from '../store/useCommandStore';
import { loadFromSupabase, saveToSupabase } from '../lib/supabaseSync';
import { logger } from '../lib/logger';

export const DEFAULT_CLOUD_SYNC_STATUS = {
  state: 'idle',
  lastSavedAt: null,
  lastError: '',
};

const readLocalAux = () => {
  const saved = localStorage.getItem('dailywave_state');
  if (!saved) return { sopLibrary: [], completionHistory: [], chaosInbox: [] };
  try {
    const parsed = JSON.parse(saved);
    return {
      sopLibrary: Array.isArray(parsed?.sopLibrary) ? parsed.sopLibrary : [],
      completionHistory: Array.isArray(parsed?.completionHistory) ? parsed.completionHistory : [],
      chaosInbox: Array.isArray(parsed?.chaosInbox) ? parsed.chaosInbox : [],
    };
  } catch {
    return { sopLibrary: [], completionHistory: [], chaosInbox: [] };
  }
};

const normalizeRoutines = (rawRoutines, todayKey, lastOpenedDate) => {
  const list = Array.isArray(rawRoutines) ? rawRoutines : [];
  return list.map((routine) => {
    const base = typeof routine === 'object' && routine !== null ? routine : {};
    const rawDoneDate = base.doneDate || base.done_date || null;
    const doneDate = typeof rawDoneDate === 'string' ? rawDoneDate.slice(0, 10) : null;

    if (doneDate) {
      return { ...base, done: doneDate === todayKey, doneDate };
    }

    const done = lastOpenedDate === todayKey ? !!base.done : false;
    return { ...base, done, doneDate: done ? todayKey : null };
  });
};

const normalizeState = (rawState, aux, todayKey, lastOpenedDate) => {
  const source = rawState && typeof rawState === 'object' ? rawState : {};
  return {
    pipelines: Array.isArray(source.pipelines) ? source.pipelines : [],
    routines: normalizeRoutines(source.routines, todayKey, lastOpenedDate),
    sopLibrary: Array.isArray(source.sopLibrary) ? source.sopLibrary : aux.sopLibrary,
    completionHistory: Array.isArray(source.completionHistory)
      ? source.completionHistory
      : aux.completionHistory,
    chaosInbox: Array.isArray(source.chaosInbox) ? source.chaosInbox : aux.chaosInbox,
  };
};

const getTodayKey = (date = new Date()) => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const usePersistenceSync = ({
  user,
  isGuest,
  backendUrl,
  apiSecretKey,
  hydrate,
  t,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => DEFAULT_CLOUD_SYNC_STATUS);

  const todayKey = useMemo(() => getTodayKey(), []);

  const lastSupabaseSignatureRef = useRef('');
  const lastSupabaseSavedAtRef = useRef(0);
  const pendingSupabasePayloadRef = useRef(null);
  const pendingSupabaseSignatureRef = useRef('');
  const supabaseTimeoutIdRef = useRef(null);
  const supabaseInFlightRef = useRef(false);

  const syncFromCloud = useCallback(async () => {
    if (!user || isGuest) {
      return { requiresAuth: true };
    }

    try {
      setCloudSyncStatus((prev) => ({ ...prev, state: 'loading', lastError: '' }));
      const res = await loadFromSupabase(user.id, { returnError: true });
      if (!res?.data) {
        const message =
          res?.error?.code === 'not_configured'
            ? t('auth.notConfigured', 'Cloud sync is not configured. Using local storage.')
            : res?.error?.message
              ? `${t('settings.syncFailed', 'Could not load from cloud.')} (${res.error.message})`
              : t('settings.syncFailed', 'Could not load from cloud.');

        setCloudSyncStatus((prev) => ({
          ...prev,
          state: 'error',
          lastError: message,
        }));

        return { ok: false, message };
      }

      const current = useCommandStore.getState();
      hydrate({
        pipelines: res.data.pipelines,
        routines: res.data.routines,
        sopLibrary: current.sopLibrary,
        completionHistory: current.completionHistory,
        chaosInbox: current.chaosInbox,
      });

      lastSupabaseSignatureRef.current = JSON.stringify({
        pipelines: res.data.pipelines,
        routines: res.data.routines,
      });
      lastSupabaseSavedAtRef.current = Date.now();
      pendingSupabasePayloadRef.current = null;
      pendingSupabaseSignatureRef.current = '';
      clearTimeout(supabaseTimeoutIdRef.current);
      supabaseInFlightRef.current = false;

      setCloudSyncStatus((prev) => ({ ...prev, state: 'idle', lastError: '' }));
      return { ok: true, message: t('settings.synced', 'Synced from cloud.') };
    } catch {
      const message = t('settings.syncFailed', 'Could not load from cloud.');
      setCloudSyncStatus((prev) => ({ ...prev, state: 'error', lastError: message }));
      return { ok: false, message };
    }
  }, [hydrate, isGuest, t, user]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const lastOpenedStorageKey = 'dailywave_last_opened_date';
      const lastOpenedDate = localStorage.getItem(lastOpenedStorageKey) || '';
      const aux = readLocalAux();

      if (user && !isGuest) {
        const sbData = await loadFromSupabase(user.id);
        if (sbData && (sbData.pipelines.length > 0 || sbData.routines.length > 0)) {
          hydrate(normalizeState({ ...sbData, sopLibrary: undefined, completionHistory: undefined }, aux, todayKey, lastOpenedDate));
          logger.log('Loaded state from Supabase.');

          lastSupabaseSignatureRef.current = JSON.stringify({
            pipelines: sbData.pipelines,
            routines: sbData.routines,
          });
          lastSupabaseSavedAtRef.current = Date.now();
          pendingSupabasePayloadRef.current = null;
          pendingSupabaseSignatureRef.current = '';
          clearTimeout(supabaseTimeoutIdRef.current);
          supabaseInFlightRef.current = false;
          localStorage.setItem(lastOpenedStorageKey, todayKey);
          setIsLoading(false);
          return;
        }
      }

      if (backendUrl) {
        try {
          const res = await fetch(`${backendUrl}/api/persistence/load`, {
            headers: {
              ...(apiSecretKey && { 'X-API-Key': apiSecretKey }),
            },
          });
          const data = await res.json();
          if (data.status === 'loaded' && data.data) {
            hydrate(normalizeState(data.data, aux, todayKey, lastOpenedDate));
            logger.log('Loaded state from backend file.');
            localStorage.setItem(lastOpenedStorageKey, todayKey);
            setIsLoading(false);
            return;
          }
        } catch {
          logger.log('Backend not available, using localStorage');
        }
      }

      const saved = localStorage.getItem('dailywave_state');
      if (saved) {
        try {
          hydrate(normalizeState(JSON.parse(saved), aux, todayKey, lastOpenedDate));
        } catch (e) {
          console.error('Failed to parse local storage state', e);
          localStorage.removeItem('dailywave_state');
        }
      }

      localStorage.setItem(lastOpenedStorageKey, todayKey);
      setIsLoading(false);
    };

    const flushSupabase = async () => {
      if (!user || isGuest) return;
      if (supabaseInFlightRef.current) return;
      if (!pendingSupabasePayloadRef.current) return;

      const payload = pendingSupabasePayloadRef.current;
      const signature = pendingSupabaseSignatureRef.current;

      supabaseInFlightRef.current = true;
      setCloudSyncStatus((prev) => ({ ...prev, state: 'saving', lastError: '' }));

      let ok = false;
      try {
        ok = await saveToSupabase(user.id, payload);
      } catch (err) {
        console.error('Supabase autosave error:', err);
      }

      supabaseInFlightRef.current = false;
      if (cancelled) return;

      if (ok) {
        const now = Date.now();
        lastSupabaseSavedAtRef.current = now;
        lastSupabaseSignatureRef.current = signature;
        setCloudSyncStatus({ state: 'idle', lastSavedAt: now, lastError: '' });

        if (pendingSupabaseSignatureRef.current === signature) {
          pendingSupabasePayloadRef.current = null;
          pendingSupabaseSignatureRef.current = '';
        }

        if (pendingSupabasePayloadRef.current && pendingSupabaseSignatureRef.current) {
          scheduleSupabaseSave(pendingSupabasePayloadRef.current, pendingSupabaseSignatureRef.current);
        }

        return;
      }

      lastSupabaseSavedAtRef.current = Date.now();
      setCloudSyncStatus((prev) => ({
        ...prev,
        state: 'error',
        lastError: 'Cloud save failed. Retrying…',
      }));

      clearTimeout(supabaseTimeoutIdRef.current);
      supabaseTimeoutIdRef.current = setTimeout(() => {
        flushSupabase().catch(() => {});
      }, 15000);
    };

    const scheduleSupabaseSave = (payload, signature) => {
      pendingSupabasePayloadRef.current = payload;
      pendingSupabaseSignatureRef.current = signature;

      const now = Date.now();
      const minIntervalMs = 5000;
      const waitMs = Math.max(0, minIntervalMs - (now - lastSupabaseSavedAtRef.current));

      clearTimeout(supabaseTimeoutIdRef.current);
      if (waitMs === 0) {
        flushSupabase().catch(() => {});
        return;
      }

      supabaseTimeoutIdRef.current = setTimeout(() => {
        flushSupabase().catch(() => {});
      }, waitMs);
    };

    const save = (state) => {
      const payload = {
        pipelines: state.pipelines,
        routines: state.routines,
        sopLibrary: state.sopLibrary,
        completionHistory: state.completionHistory,
        chaosInbox: state.chaosInbox,
      };
      localStorage.setItem('dailywave_state', JSON.stringify(payload));

      if (user && !isGuest) {
        const supabasePayload = {
          pipelines: state.pipelines,
          routines: state.routines,
        };
        const signature = JSON.stringify(supabasePayload);
        if (signature !== lastSupabaseSignatureRef.current) {
          scheduleSupabaseSave(supabasePayload, signature);
        }
      } else {
        clearTimeout(supabaseTimeoutIdRef.current);
        pendingSupabasePayloadRef.current = null;
        pendingSupabaseSignatureRef.current = '';
        supabaseInFlightRef.current = false;
        setCloudSyncStatus({ state: 'idle', lastSavedAt: null, lastError: '' });
      }

      if (backendUrl) {
        fetch(`${backendUrl}/api/persistence/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiSecretKey && { 'X-API-Key': apiSecretKey }),
          },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    };

    loadData().catch(() => setIsLoading(false));

    let timeoutId;
    const unsubscribe = useCommandStore.subscribe((state) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => save(state), 1000);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(timeoutId);
      clearTimeout(supabaseTimeoutIdRef.current);
    };
  }, [apiSecretKey, backendUrl, hydrate, todayKey, user, isGuest]);

  return {
    isLoading,
    cloudSyncStatus,
    syncFromCloud,
  };
};
