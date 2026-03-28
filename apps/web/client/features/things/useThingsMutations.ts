"use client";

import { useAuth } from "@client/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createThing, deleteThing, updateThing } from "./thingsApi";
import { thingsKeys } from "./thingsKeys";

export function useCreateThingMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing access token.");
      }
      return createThing(token, name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: thingsKeys.list() });
    },
  });
}

export function useUpdateThingMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing access token.");
      }
      return updateThing(token, id, name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: thingsKeys.list() });
    },
  });
}

export function useDeleteThingMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing access token.");
      }
      await deleteThing(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: thingsKeys.list() });
    },
  });
}
