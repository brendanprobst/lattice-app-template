import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { RequestWithUser } from '@api/auth/types';
import { IAllowedEmailRepository } from '@api/domain/repositories/IAllowedEmailRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Logger } from '@api/utils/logger';

const DEFAULT_TTL_MS = 60_000;

interface CacheEntry {
  allowed: boolean;
  expiresAt: number;
}

interface RequireAllowedEmailOptions {
  /**
   * Force the gate on/off regardless of the `EMAIL_ALLOWLIST_ENABLED` env var.
   * Mostly for tests; production wiring should leave this undefined and rely
   * on the env flag so toggling is a single redeploy.
   */
  enabled?: boolean;
  /** Override default 60s positive/negative cache TTL (mostly for tests). */
  cacheTtlMs?: number;
  /** Inject a clock for deterministic cache tests. */
  now?: () => number;
}

/**
 * Reads the `EMAIL_ALLOWLIST_ENABLED` env var. Defaults to OFF so the gate is
 * opt-in: applying the SQL migration alone does not start rejecting traffic
 * — the operator must explicitly flip both the env var and the DB setting.
 *
 * Treats case-insensitive `true` and `1` as enabled (some hosts / consoles normalize booleans).
 */
export function isEmailAllowlistEnabled(): boolean {
  const raw = process.env.EMAIL_ALLOWLIST_ENABLED?.trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

/**
 * Defense-in-depth check that runs after `requireSupabaseAuth`. Even though the
 * Postgres trigger blocks new signups whose email is not on the allowlist, an
 * already-issued JWT can still be presented after we revoke a friend's access.
 * This middleware enforces the allowlist on every request, with a small TTL
 * cache so we do not query Supabase per call.
 */
export function requireAllowedEmail(
  repository: IAllowedEmailRepository,
  options: RequireAllowedEmailOptions = {},
): RequestHandler {
  const enabled = options.enabled ?? isEmailAllowlistEnabled();
  if (!enabled) {
    return function passThroughAllowedEmailMiddleware(_req, _res, next) {
      next();
    };
  }

  const ttl = options.cacheTtlMs ?? DEFAULT_TTL_MS;
  const now = options.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();

  return async function requireAllowedEmailMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authReq = req as RequestWithUser;
    const email = authReq.user?.email?.trim().toLowerCase() ?? null;

    if (!email) {
      res.status(403).json({
        error: {
          status: 403,
          code: ErrorCatalog.EMAIL_NOT_APPROVED.code,
          message: ErrorCatalog.EMAIL_NOT_APPROVED.message,
        },
      });
      return;
    }

    const cached = cache.get(email);
    if (cached && cached.expiresAt > now()) {
      if (cached.allowed) {
        next();
        return;
      }
      res.status(403).json({
        error: {
          status: 403,
          code: ErrorCatalog.EMAIL_NOT_APPROVED.code,
          message: ErrorCatalog.EMAIL_NOT_APPROVED.message,
        },
      });
      return;
    }

    try {
      const allowed = await repository.isAllowed(email);
      cache.set(email, { allowed, expiresAt: now() + ttl });
      if (!allowed) {
        res.status(403).json({
          error: {
            status: 403,
            code: ErrorCatalog.EMAIL_NOT_APPROVED.code,
            message: ErrorCatalog.EMAIL_NOT_APPROVED.message,
          },
        });
        return;
      }
      next();
    } catch (error) {
      Logger.error(
        `[auth] allowlist lookup failed for ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(503).json({
        error: {
          status: 503,
          code: ErrorCatalog.ALLOWLIST_UNAVAILABLE.code,
          message: ErrorCatalog.ALLOWLIST_UNAVAILABLE.message,
        },
      });
    }
  };
}
