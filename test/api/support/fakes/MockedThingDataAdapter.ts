import { ThingDataAdapter, ThingDataAdapterOptions, ThingRecord } from '@api/infrastructure/adapters/ThingDataAdapter';

export class MockedThingDataAdapter implements ThingDataAdapter {
  private readonly store = new Map<number, ThingRecord>();

  async get<T>(path: string): Promise<T> {
    if (path.includes('id=eq.')) {
      const id = this.extractId(path);
      const row = this.store.get(id);
      return (row ? [row] : []) as T;
    }

    return Array.from(this.store.values()) as T;
  }

  async post<T>(path: string, body?: unknown, _options: ThingDataAdapterOptions = {}): Promise<T> {
    if (!path.includes('on_conflict=id')) {
      throw new Error(`Unexpected POST path: ${path}`);
    }

    const payload = Array.isArray(body) ? (body as ThingRecord[]) : [];
    for (const row of payload) {
      this.store.set(row.id, row);
    }

    return [] as T;
  }

  async update<T>(path: string, body?: unknown): Promise<T> {
    if (!path.includes('id=eq.')) {
      throw new Error(`Unexpected UPDATE path: ${path}`);
    }

    const id = this.extractId(path);
    const existing = this.store.get(id);
    if (!existing) {
      return [] as T;
    }

    const patch = (body ?? {}) as Partial<ThingRecord>;
    const next: ThingRecord = {
      ...existing,
      ...patch,
      id: existing.id,
    };
    this.store.set(id, next);
    return [next] as T;
  }

  async delete<T>(path: string): Promise<T> {
    const id = this.extractId(path);
    const existing = this.store.get(id);
    if (!existing) {
      return [] as T;
    }
    this.store.delete(id);
    return [{ id }] as T;
  }

  private extractId(path: string): number {
    const match = path.match(/id=eq\.([^&]+)/);
    if (!match) {
      throw new Error(`Path does not contain id filter: ${path}`);
    }
    const parsed = Number(decodeURIComponent(match[1]));
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Path contains invalid numeric id: ${path}`);
    }
    return parsed;
  }
}
