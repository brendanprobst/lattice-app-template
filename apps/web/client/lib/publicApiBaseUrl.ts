/**
 * Base URL for browser calls to the API. Set NEXT_PUBLIC_API_URL in `.env.local`
 * (see `.env.example`).
 */
export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}
