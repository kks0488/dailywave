import { describe, it, expect } from 'vitest';

describe('supabase - safe import without env', () => {
  it('does not throw when env vars are missing', async () => {
    const mod = await import('../supabase');
    expect(typeof mod.isSupabaseConfigured).toBe('function');
    expect(mod.isSupabaseConfigured()).toBe(false);
    expect(mod.supabase).toBeNull();
  });
});

