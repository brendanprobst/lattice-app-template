"use client";

import { useAuth } from "@client/auth";
import { useThingsStore } from "@client/stores/thingsStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchThingsList } from "./thingsApi";
import { thingsKeys } from "./thingsKeys";
import type { Thing } from "./types";

function sortByNewestFirst(things: Thing[]): Thing[] {
  return [...things].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Server list via React Query; pagination is client-side until the API supports
 * `limit`/`offset` (or cursor). Swap the `queryFn` for `useInfiniteQuery` when
 * the backend paginates.
 */
export function useThingsList() {
  const { getAccessToken, session, loading: authLoading } = useAuth();
  const page = useThingsStore((s) => s.page);
  const pageSize = useThingsStore((s) => s.pageSize);
  const setPage = useThingsStore((s) => s.setPage);
  const nextPage = useThingsStore((s) => s.nextPage);
  const prevPage = useThingsStore((s) => s.prevPage);
  const setPageSize = useThingsStore((s) => s.setPageSize);

  const query = useQuery<Thing[]>({
    queryKey: thingsKeys.list(),
    enabled: !authLoading && session != null,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing access token.");
      }
      return fetchThingsList(token);
    },
  });

  const sorted = useMemo(() => sortByNewestFirst(query.data ?? []), [query.data]);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);
  const hasNextPage = safePage < totalPages;
  const hasPrevPage = safePage > 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
