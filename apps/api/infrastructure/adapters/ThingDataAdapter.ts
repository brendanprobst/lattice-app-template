export type ThingRecord = {
  id: number;
  name: string;
  created_at: string;
};

export type ThingDataAdapterOptions = {
  headers?: Record<string, string>;
};

/**
 * Adapter port for Thing persistence backends.
 * Concrete clients (Supabase, DynamoDB, etc.) implement this contract.
 */
export interface ThingDataAdapter {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown, options?: ThingDataAdapterOptions): Promise<T>;
  update<T>(path: string, body?: unknown, options?: ThingDataAdapterOptions): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

