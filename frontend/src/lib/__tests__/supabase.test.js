import { describe, it, expect } from 'vitest';

describe('supabase - safe import without env', () => {
  it('imports safely (with or without env)', async () => {
    const mod = await import('../supabase');
    expect(typeof mod.isSupabaseConfigured).toBe('function');
    const configured = mod.isSupabaseConfigured();
    if (configured) {
      expect(mod.supabase).not.toBeNull();
    } else {
      expect(mod.supabase).toBeNull();
    }
  });
});
