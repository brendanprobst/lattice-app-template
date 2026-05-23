import type { RequestHandler } from 'express';
import { isEmailAllowlistEnabled, requireAllowedEmail } from '@api/auth/requireAllowedEmail';
import { requireSupabaseAuth } from '@api/auth/supabaseAuthMiddleware';
import type { Container } from '@api/infrastructure/container';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Logger } from '@api/utils/logger';

/**
 * One allowlist middleware instance per app (shared cache across /things, /profile, /me).
 * Created when {@link createProtectedMiddlewareStack} runs inside {@link createApp}.
 */
let allowlistMiddlewareForApp: RequestHandler | null = null;

function allowlistRequiresSupabaseMiddleware(): RequestHandler {
  return function allowlistRequiresSupabase(_req, res, _next) {
    Logger.error(
      '[auth] EMAIL_ALLOWLIST_ENABLED is set but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing — allowlist needs PostgREST.',
    );
    res.status(503).json({
      error: {
        status: 503,
        code: ErrorCatalog.ALLOWLIST_UNAVAILABLE.code,
        message: ErrorCatalog.ALLOWLIST_UNAVAILABLE.message,
      },
    });
  };
}

/**
 * Auth middleware applied once per protected route prefix in `app.ts`.
 * Order: Supabase JWT → optional email allowlist (when `EMAIL_ALLOWLIST_ENABLED`).
 */
export function createProtectedMiddlewareStack(container: Container): RequestHandler[] {
  const stack: RequestHandler[] = [requireSupabaseAuth];

  if (!isEmailAllowlistEnabled()) {
    return stack;
  }

  if (!container.isAllowlistConfigured()) {
    stack.push(allowlistRequiresSupabaseMiddleware());
    return stack;
  }

  if (!allowlistMiddlewareForApp) {
    allowlistMiddlewareForApp = requireAllowedEmail(container.getAllowedEmailRepository());
  }
  stack.push(allowlistMiddlewareForApp);

  return stack;
}

/** Test-only: reset shared allowlist middleware between app instances. */
export function resetProtectedMiddlewareStackForTests(): void {
  allowlistMiddlewareForApp = null;
}
