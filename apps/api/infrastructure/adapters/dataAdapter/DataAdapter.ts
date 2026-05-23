export type DataAdapterOptions = {
  headers?: Record<string, string>;
};

export interface DataAdapter {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T>;
  update<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T>;
  delete<T>(path: string): Promise<T>;
}
