import { AuthRouteLoading, SignInPage } from "@client/pages/auth";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<AuthRouteLoading />}>
      <SignInPage />
    </Suspense>
  );
}
