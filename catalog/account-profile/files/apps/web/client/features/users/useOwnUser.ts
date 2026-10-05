"use client";

import { useAuth } from "@client/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOwnUser, updateUser } from "./usersApi";
import { usersKeys } from "./usersKeys";
import type { UserProfileUpdate } from "./types";

export function useOwnUser(userId: string | null) {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: userId ? usersKeys.own(userId) : usersKeys.all,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !userId) throw new Error("Sign in to load your profile.");
      return fetchOwnUser(token, userId);
    },
    enabled: !!userId,
  });
}

export function useUpdateUserMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UserProfileUpdate;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to save your profile.");
      return updateUser(token, id, payload);
    },
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: usersKeys.own(user.id) });
      void queryClient.invalidateQueries({ queryKey: usersKeys.detail(user.id) });
    },
  });
}
