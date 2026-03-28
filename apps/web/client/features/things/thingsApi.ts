import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import type { Thing } from "./types";

export async function fetchThingsList(token: string): Promise<Thing[]> {
  const response = await authenticatedApiRequest("/things", { token, method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to load things.");
  }
  return (await response.json()) as Thing[];
}

export async function createThing(token: string, name: string): Promise<Thing> {
  const response = await authenticatedApiRequest("/things", {
    token,
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error("Failed to create thing.");
  }
  return (await response.json()) as Thing;
}

export async function updateThing(token: string, id: number, name: string): Promise<Thing> {
  const response = await authenticatedApiRequest(`/things/${id}`, {
    token,
    method: "PUT",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error("Failed to update thing.");
  }
  return (await response.json()) as Thing;
}

export async function deleteThing(token: string, id: number): Promise<void> {
  const response = await authenticatedApiRequest(`/things/${id}`, {
    token,
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete thing.");
  }
}
