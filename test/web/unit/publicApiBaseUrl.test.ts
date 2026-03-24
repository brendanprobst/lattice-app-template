import { afterEach, describe, expect, it } from 'vitest';
import { getPublicApiBaseUrl } from '@client/lib/publicApiBaseUrl';

describe('getPublicApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns NEXT_PUBLIC_API_URL when set', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    expect(getPublicApiBaseUrl()).toBe('https://api.example.com');
  });
});
