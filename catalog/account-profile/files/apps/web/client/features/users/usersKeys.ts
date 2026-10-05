export const usersKeys = {
  all: ["users"] as const,
  detail: (id: string) => [...usersKeys.all, "detail", id] as const,
  own: (id: string) => [...usersKeys.all, "own", id] as const,
};
