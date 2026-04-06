/**
 * Env gate for PostHog-backed analytics (must stay aligned with `PostHogAnalyticsAdapter`).
 */
export function isPostHogAnalyticsConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_LATTICE_E2E === "1") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_LATTICE_POSTHOG_ENABLED !== "1") {
    return false;
  }
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim();
  return Boolean(token);
}
