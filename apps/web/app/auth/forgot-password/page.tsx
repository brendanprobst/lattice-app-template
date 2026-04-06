import { AuthRouteLoading, ForgotPasswordPage } from "@client/pages/auth";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<AuthRouteLoading />}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
