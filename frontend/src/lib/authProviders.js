const KNOWN_PROVIDERS = new Set(['google', 'apple', 'github']);

function parseProviders(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return ['google'];

  const parts = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const filtered = parts.filter((p) => KNOWN_PROVIDERS.has(p));
  return filtered.length ? Array.from(new Set(filtered)) : ['google'];
}

export function getEnabledAuthProviders() {
  return parseProviders(import.meta.env.VITE_AUTH_PROVIDERS);
}

export function isAuthProviderEnabled(provider) {
  const p = typeof provider === 'string' ? provider.toLowerCase() : '';
  return getEnabledAuthProviders().includes(p);
}

export const __test__ = { parseProviders };
