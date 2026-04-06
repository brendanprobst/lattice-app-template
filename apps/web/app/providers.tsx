"use client";

import { PostHogPageView } from "@client/analytics/PostHogPageView";
import { AuthProvider } from "@client/auth";
import { getAnalyticsAdapter } from "@client/lib/analytics/getAnalyticsAdapter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-js/react";
import { ReactNode, useState } from "react";

const analytics = getAnalyticsAdapter();
const analyticsEnabled = analytics.isEnabled();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const tree = (
    <QueryClientProvider client={queryClient}>
      {analyticsEnabled ? <PostHogPageView /> : null}
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  if (!analyticsEnabled) {
    return tree;
  }

  const posthogClient = analytics.getPostHogClient();
  if (!posthogClient) {
    return tree;
  }

  return <PostHogProvider client={posthogClient}>{tree}</PostHogProvider>;
}
