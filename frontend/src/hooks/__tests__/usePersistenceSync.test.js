import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabaseSync', () => ({
  loadFromSupabase: vi.fn(),
  saveToSupabase: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { usePersistenceSync } from '../usePersistenceSync';
import { useCommandStore } from '../../store/useCommandStore';
import { loadFromSupabase, saveToSupabase } from '../../lib/supabaseSync';

const t = (_key, fallback) => fallback || '';

const resetStore = () => {
  const state = useCommandStore.getState();
  state.hydrate({
    pipelines: [],
    routines: [],
    sopLibrary: [],
    completionHistory: [],
    chaosInbox: [],
  });
  useCommandStore.setState({ past: [], future: [] });
};

const buildPipeline = (id, title) => ({
  id,
  title,
  subtitle: '',
  color: 'blue',
  iconType: 'briefcase',
  steps: [{ id: `${id}-1`, title: 'Step', status: 'active' }],
});

describe('usePersistenceSync', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    resetStore();
  });

  it('removes invalid local state JSON during load fallback', async () => {
    loadFromSupabase.mockResolvedValue(null);
    localStorage.setItem('dailywave_state', '{invalid-json');

    const { result, unmount } = renderHook(() =>
      usePersistenceSync({
        user: null,
        isGuest: true,
        backendUrl: '',
        apiSecretKey: '',
        hydrate: useCommandStore.getState().hydrate,
        t,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(localStorage.getItem('dailywave_state')).toBeNull();
    unmount();
  });

  it('queues latest payload and saves it after min interval', async () => {
    vi.useFakeTimers();
    loadFromSupabase.mockResolvedValue(null);
    saveToSupabase.mockResolvedValue(true);

    const { result, unmount } = renderHook(() =>
      usePersistenceSync({
        user: { id: 'user-1' },
        isGuest: false,
        backendUrl: '',
        apiSecretKey: '',
        hydrate: useCommandStore.getState().hydrate,
        t,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(false);

    act(() => {
      useCommandStore.getState().hydrate({
        pipelines: [buildPipeline('p1', 'First')],
        routines: [],
        sopLibrary: [],
        completionHistory: [],
        chaosInbox: [],
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });

    expect(saveToSupabase).toHaveBeenCalledTimes(1);
    expect(saveToSupabase.mock.calls[0][1].pipelines[0].title).toBe('First');

    act(() => {
      useCommandStore.getState().hydrate({
        pipelines: [buildPipeline('p2', 'Second')],
        routines: [],
        sopLibrary: [],
        completionHistory: [],
        chaosInbox: [],
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });

    expect(saveToSupabase).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3999);
      await Promise.resolve();
    });
    expect(saveToSupabase).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await Promise.resolve();
    });
    expect(saveToSupabase).toHaveBeenCalledTimes(2);
    expect(saveToSupabase.mock.calls[1][1].pipelines[0].title).toBe('Second');

    unmount();
    vi.useRealTimers();
  });
});
