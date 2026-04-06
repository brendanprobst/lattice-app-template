# `client/lib/analytics/` — Browser analytics adapters

## Purpose

**Isolate** third-party analytics SDKs behind an **`<Service>Adapter`** port so UI and `instrumentation-client.ts` do not import vendor SDKs directly.

## Layout

| File | Role |
|------|------|
| **`<Service>Adapter.ts`** | Interface (`initFromEnv`, `capturePageView`, `getPostHogClient`, …). |
| **`<Service>Env.ts`** | Env gate shared with the `<service>` implementation. |
| **`get<Service>Adapter.ts`** | Singleton factory. |
| **`noop/`** | **`Noop<Service>Adapter`** — no-ops when disabled. |
| **`<Service>/`** | **`<Service>AnalyticsAdapter`** — `<service>` wiring. |

## Conventions

- Add new vendors as **`something/Something<Service>Adapter.ts`** implementing **`<Service>Adapter`**, then extend **`create<Service>Adapter()`** (or a small strategy) in **`get<Service>Adapter.ts`**.
- Keep **`instrumentation-client.ts`** to a single **`get<Service>Adapter().initFromEnv()`** call.
