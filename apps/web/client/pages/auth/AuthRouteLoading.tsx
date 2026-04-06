/** Shared Suspense fallback for auth routes that use `useSearchParams`. */
export function AuthRouteLoading() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
      <p className="text-muted-foreground text-sm font-medium">Loading…</p>
    </main>
  );
}
