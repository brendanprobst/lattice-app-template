"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUserById } from "./usersApi";
import { usersKeys } from "./usersKeys";

export function useUser(id: string | null) {
  return useQuery({
    queryKey: id ? usersKeys.detail(id) : usersKeys.all,
    queryFn: () => fetchUserById(id!),
    enabled: !!id,
  });
}
