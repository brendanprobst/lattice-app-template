import { LoginPage } from "@client/pages/login";
import { Suspense } from "react";

function LoginLoading() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
      <p className="text-muted-foreground text-sm font-medium">Loading…</p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginPage />
    </Suspense>
  );
}
