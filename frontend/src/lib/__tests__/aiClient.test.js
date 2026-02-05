import { beforeEach, describe, expect, it, vi } from 'vitest';
import { askAi, getAiStatus, resetAiClientCache } from '../aiClient';

describe('aiClient', () => {
  beforeEach(() => {
    resetAiClientCache();
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('throws backend detail when backend rejects and no local key exists', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Auth required' }),
      });

    await expect(
      askAi({
        prompt: 'hello',
        context: {},
        userId: null,
        systemPrompt: 'system',
        getLocalApiKey: () => '',
        baseUrl: 'http://backend.test',
      })
    ).rejects.toThrow('Auth required');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://backend.test/api/ai/ask');
  });

  it('falls back to direct Gemini when backend rejects but local key is present', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'Forbidden' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'fallback-text' }],
              },
            },
          ],
        }),
      });

    const text = await askAi({
      prompt: 'hello',
      context: { x: 1 },
      userId: 'user-1',
      systemPrompt: 'system',
      getLocalApiKey: () => 'local-api-key',
      baseUrl: 'http://backend.test',
    });

    expect(text).toBe('fallback-text');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('http://backend.test/api/ai/ask');
    expect(fetchMock.mock.calls[1][0]).toContain('generativelanguage.googleapis.com');
    expect(fetchMock.mock.calls[1][0]).toContain('key=local-api-key');
  });

  it('caches AI status responses per baseUrl within TTL', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ai_proxy_reachable: true,
          gemini_configured: true,
          memu_reachable: true,
          require_supabase_auth_for_ai: false,
          rate_limits: { per_minute: 30, per_hour: 300 },
        }),
      });

    const first = await getAiStatus({ baseUrl: 'http://backend.test', force: true });
    const second = await getAiStatus({ baseUrl: 'http://backend.test' });

    expect(first.ai_proxy_reachable).toBe(true);
    expect(second.gemini_configured).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
