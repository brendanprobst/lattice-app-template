import type { AnalyticsAdapter } from "../AnalyticsAdapter";
import type { PostHog } from "posthog-js";
import posthog from "posthog-js";

/**
 * PostHog Cloud / self-hosted via `posthog-js` (see `docs/playbooks/posthog-analytics.md`).
 */
export class PostHogAnalyticsAdapter implements AnalyticsAdapter {
  private didInit = false;

  isEnabled(): boolean {
    return true;
  }

  initFromEnv(): void {
    if (this.didInit) {
      return;
    }
    const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim();
    if (!token) {
      return;
    }
    this.didInit = true;
    const apiHost =
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

    posthog.init(token, {
      api_host: apiHost,
      capture_pageview: false,
      capture_pageleave: true,
      defaults: "2026-01-30",
      disable_session_recording: true,
      persistence: "localStorage+cookie",
    });
  }

  capturePageView(href: string): void {
    posthog.capture("$pageview", {
      $current_url: href,
    });
  }

  getPostHogClient(): PostHog | null {
    return posthog;
  }
}
