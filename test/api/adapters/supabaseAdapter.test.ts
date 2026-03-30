import { SupabaseAdapter } from '@api/infrastructure/adapters/supabase/SupabaseAdapter';

const baseUrl = 'https://example.supabase.co';
const serviceRoleKey = 'test-service-role-key';
const config = { url: baseUrl, serviceRoleKey };

describe('SupabaseAdapter', () => {
  const fetchMock = jest.fn();
  let originalFetch: typeof global.fetch | undefined;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof global.fetch;
    fetchMock.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch as typeof global.fetch;
  });

  function okJson(data: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(data), { status: 200, ...init });
  }

  it('GET requests rest path with service role headers', async () => {
    fetchMock.mockResolvedValueOnce(okJson([{ id: 1 }]));
    const adapter = new SupabaseAdapter(config);

    const result = await adapter.get<{ id: number }[]>('things?select=*');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/rest/v1/things?select=*`, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('POST sends JSON body when provided', async () => {
    fetchMock.mockResolvedValueOnce(okJson([{ ok: true }]));
    const adapter = new SupabaseAdapter(config);
    const body = { name: 'x' };

    await adapter.post<typeof body[]>('things', body);

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/rest/v1/things`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  });

  it('POST omits body when undefined', async () => {
    fetchMock.mockResolvedValueOnce(okJson([]));
    const adapter = new SupabaseAdapter(config);

    await adapter.post('rpc/empty');

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/rest/v1/rpc/empty`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });
  });

  it('PATCH update sends body and uses PATCH', async () => {
    fetchMock.mockResolvedValueOnce(okJson([{ id: 1, name: 'patched' }]));
    const adapter = new SupabaseAdapter(config);

    await adapter.update('things?id=eq.1', { name: 'patched' });

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/rest/v1/things?id=eq.1`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'patched' }),
    });
  });

  it('DELETE uses DELETE method', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const adapter = new SupabaseAdapter(config);

    await adapter.delete('things?id=eq.1');

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/rest/v1/things?id=eq.1`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });
  });

  it('merges optional headers and allows overriding Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(okJson([]));
    const adapter = new SupabaseAdapter(config);

    await adapter.post('things', {}, { headers: { Prefer: 'return=minimal', 'Content-Type': 'custom' } });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/rest/v1/things`,
      expect.objectContaining({
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'custom',
          Prefer: 'return=minimal',
        },
      }),
    );
  });

  it('throws with status and response body when response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(new Response('permission denied', { status: 403 }));
    const adapter = new SupabaseAdapter(config);

    await expect(adapter.get('things')).rejects.toThrow(
      'Supabase request failed (403): permission denied',
    );
  });

  it('returns empty array for 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const adapter = new SupabaseAdapter(config);

    const result = await adapter.post<unknown[]>('things', {});

    expect(result).toEqual([]);
  });

  it('returns empty array for success with empty body (e.g. Prefer: return=minimal)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }));
    const adapter = new SupabaseAdapter(config);

    const result = await adapter.post<unknown[]>('things', { id: 1 });

    expect(result).toEqual([]);
  });

  it('returns empty array for whitespace-only body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('  \n  ', { status: 200 }));
    const adapter = new SupabaseAdapter(config);

    const result = await adapter.get<unknown[]>('things');

    expect(result).toEqual([]);
  });

  describe('default config from environment', () => {
    const savedUrl = process.env.SUPABASE_URL;
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    afterEach(() => {
      process.env.SUPABASE_URL = savedUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
    });

    it('throws when SUPABASE_URL is missing', () => {
      process.env.SUPABASE_URL = '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';

      expect(() => new SupabaseAdapter()).toThrow(/Missing required environment variable: SUPABASE_URL/);
    });

    it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      process.env.SUPABASE_URL = 'https://x.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = '';

      expect(() => new SupabaseAdapter()).toThrow(
        /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/,
      );
    });

    it('trims env values', async () => {
      process.env.SUPABASE_URL = `  ${baseUrl}  `;
      process.env.SUPABASE_SERVICE_ROLE_KEY = `  ${serviceRoleKey}  `;
      fetchMock.mockResolvedValueOnce(okJson([]));

      const adapter = new SupabaseAdapter();
      await adapter.get('things');

      expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/rest/v1/things`, expect.any(Object));
    });
  });
});
