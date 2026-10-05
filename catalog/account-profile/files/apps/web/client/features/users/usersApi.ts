import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import { getPublicApiBaseUrl } from "@client/lib/publicApiBaseUrl";
import type { UserOwner, UserProfileUpdate, UserPublic } from "./types";

type ApiErrorBody = {
  error?: { status?: number; code?: string; message?: string };
};

async function throwIfNotOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  let message = fallback;
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body.error?.message) message = body.error.message;
  } catch {
    // keep fallback
  }
  throw new Error(message);
}

async function publicApiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const { headers, ...requestInit } = init;
  return fetch(`${getPublicApiBaseUrl()}${path}`, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export async function fetchUserById(id: string): Promise<UserPublic> {
  const response = await publicApiRequest(`/users/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  await throwIfNotOk(
    response,
    response.status === 404 ? "Profile not found." : "Failed to load profile.",
  );
  return (await response.json()) as UserPublic;
}

export async function fetchOwnUser(token: string, id: string): Promise<UserOwner> {
  const response = await authenticatedApiRequest(`/users/${encodeURIComponent(id)}`, {
    token,
    method: "GET",
  });
  await throwIfNotOk(response, "Failed to load your profile.");
  return (await response.json()) as UserOwner;
}

export async function updateUser(
  token: string,
  id: string,
  payload: UserProfileUpdate,
): Promise<UserOwner> {
  const response = await authenticatedApiRequest(`/users/${encodeURIComponent(id)}`, {
    token,
    method: "PUT",
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(response, "Failed to save profile.");
  return (await response.json()) as UserOwner;
}
