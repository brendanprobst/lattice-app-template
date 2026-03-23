import { ThingDataAdapter, ThingDataAdapterOptions } from '../ThingDataAdapter';

type SupabaseAdapterConfig = {
  url: string;
  serviceRoleKey: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function getConfig(): SupabaseAdapterConfig {
  return {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

export class SupabaseAdapter implements ThingDataAdapter {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor(config = getConfig()) {
    this.url = config.url;
    this.serviceRoleKey = config.serviceRoleKey;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, 'GET');
  }

  async post<T>(path: string, body?: unknown, options: ThingDataAdapterOptions = {}): Promise<T> {
    return this.request<T>(path, 'POST', body, options);
  }

  async update<T>(path: string, body?: unknown, options: ThingDataAdapterOptions = {}): Promise<T> {
    return this.request<T>(path, 'PATCH', body, options);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, 'DELETE');
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
    options: ThingDataAdapterOptions = {}
  ): Promise<T> {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Supabase request failed (${response.status}): ${body}`);
    }

    if (response.status === 204) {
      return [] as T;
    }

    return (await response.json()) as T;
  }
}

