import { create } from "zustand";

/**
 * Client UI state for the Things list (pagination, page size).
 * Server data lives in TanStack Query; this store is the baseline pattern for
 * entity-scoped UI state that should not live in React Query cache.
 */
export type ThingsListUiState = {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
};

export const useThingsStore = create<ThingsListUiState>((set, get) => ({
  page: 1,
  pageSize: 10,
  setPage: (page) => set({ page: Math.max(1, Math.floor(page)) }),
  setPageSize: (pageSize) =>
    set({ pageSize: Math.max(1, Math.min(100, Math.floor(pageSize))), page: 1 }),
  nextPage: () => set({ page: get().page + 1 }),
  prevPage: () => set({ page: Math.max(1, get().page - 1) }),
  resetPagination: () => set({ page: 1, pageSize: 10 }),
}));
