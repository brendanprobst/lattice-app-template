import type { AnalyticsAdapter } from "../AnalyticsAdapter";
import type { PostHog } from "posthog-js";

/**
 * No network calls — used when PostHog is disabled or misconfigured.
 */
export class NoopAnalyticsAdapter implements AnalyticsAdapter {
  isEnabled(): boolean {
    return false;
  }

  initFromEnv(): void {}

  capturePageView(_href: string): void {}

  getPostHogClient(): PostHog | null {
    return null;
  }
}
