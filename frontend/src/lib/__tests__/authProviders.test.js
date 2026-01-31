import { describe, it, expect } from 'vitest';
import { __test__ } from '../authProviders';

describe('authProviders - parsing', () => {
  it('defaults to google when missing', () => {
    expect(__test__.parseProviders(undefined)).toEqual(['google']);
    expect(__test__.parseProviders('')).toEqual(['google']);
    expect(__test__.parseProviders('   ')).toEqual(['google']);
  });

  it('parses comma-separated values (deduped, lowercased)', () => {
    expect(__test__.parseProviders('Google, github, google')).toEqual(['google', 'github']);
  });

  it('falls back to google for invalid values', () => {
    expect(__test__.parseProviders('facebook')).toEqual(['google']);
  });
});
