export const thingsKeys = {
  all: ["things"] as const,
  list: () => [...thingsKeys.all, "list"] as const,
};
