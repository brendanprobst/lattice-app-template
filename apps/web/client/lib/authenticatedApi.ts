import { getPublicApiBaseUrl } from "@client/lib/publicApiBaseUrl";

interface ApiRequestInit extends Omit<RequestInit, "headers"> {
  token: string;
  headers?: HeadersInit;
}

export async function authenticatedApiRequest(path: string, init: ApiRequestInit): Promise<Response> {
  const { token, headers, ...requestInit } = init;

  return await fetch(`${getPublicApiBaseUrl()}${path}`, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });
}
