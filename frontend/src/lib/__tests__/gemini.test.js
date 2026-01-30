import { describe, it, expect, beforeEach } from 'vitest';
import { getApiKey, setApiKey, hasApiKey } from '../gemini';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Replace global localStorage
globalThis.localStorage = localStorageMock;

describe('gemini.js - Pure utility functions', () => {
  beforeEach(() => {
    // Clear localStorage and cache before each test
    localStorage.clear();
    // Clear the internal cache by setting a dummy value
    setApiKey('');
  });

  describe('API Key Management', () => {
    it('should store and retrieve API key', () => {
      const testKey = 'test-api-key-12345';

      setApiKey(testKey);
      const retrievedKey = getApiKey();

      expect(retrievedKey).toBe(testKey);
    });

    it('should return empty string when no API key is set', () => {
      const key = getApiKey();
      expect(key).toBe('');
    });

    it('should update API key when called multiple times', () => {
      setApiKey('first-key');
      expect(getApiKey()).toBe('first-key');

      setApiKey('second-key');
      expect(getApiKey()).toBe('second-key');
    });

    it('should persist API key in localStorage', () => {
      const testKey = 'persistent-key';

      setApiKey(testKey);

      // Directly check localStorage
      expect(localStorage.getItem('gemini_api_key')).toBe(testKey);
    });

    it('hasApiKey should return true when key exists', () => {
      setApiKey('some-key');
      expect(hasApiKey()).toBe(true);
    });

    it('hasApiKey should return false when key is empty', () => {
      setApiKey('');
      expect(hasApiKey()).toBe(false);
    });

    it('hasApiKey should return false when key is not set', () => {
      localStorage.clear();
      // Reset cache
      setApiKey('');
      expect(hasApiKey()).toBe(false);
    });
  });

  describe('API Key Caching', () => {
    it('should cache API key after first retrieval', () => {
      setApiKey('cached-key');

      // First call
      const firstCall = getApiKey();

      // Modify localStorage directly to test cache
      localStorage.setItem('gemini_api_key', 'different-key');

      // Second call should return cached value
      const secondCall = getApiKey();

      expect(firstCall).toBe('cached-key');
      expect(secondCall).toBe('cached-key');
    });

    it('should invalidate cache when setApiKey is called', () => {
      setApiKey('initial-key');
      expect(getApiKey()).toBe('initial-key');

      // Update with setApiKey
      setApiKey('updated-key');

      // Should get new value, not cached
      expect(getApiKey()).toBe('updated-key');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string API key', () => {
      setApiKey('');
      expect(getApiKey()).toBe('');
      expect(hasApiKey()).toBe(false);
    });

    it('should handle very long API key', () => {
      const longKey = 'x'.repeat(1000);
      setApiKey(longKey);
      expect(getApiKey()).toBe(longKey);
      expect(hasApiKey()).toBe(true);
    });

    it('should handle special characters in API key', () => {
      const specialKey = 'key-with-special!@#$%^&*()_+={}[]|:;"<>?,./';
      setApiKey(specialKey);
      expect(getApiKey()).toBe(specialKey);
    });

    it('should treat whitespace-only key as valid', () => {
      const whitespaceKey = '   ';
      setApiKey(whitespaceKey);
      expect(getApiKey()).toBe(whitespaceKey);
      expect(hasApiKey()).toBe(true);
    });
  });
});
