import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RequestWithUser } from '@api/auth/types';
import { Logger } from '@api/utils/logger';

const DEFAULT_AUDIENCE = 'authenticated';

export function getAuthVerificationStartupInfo(): {
  mode: 'hs256-secret' | 'jwks';
  issuer: string;
  audience: string;
} {
  const mode = process.env.SUPABASE_JWT_SECRET?.trim() ? 'hs256-secret' : 'jwks';
  return {
    mode,
    issuer: getExpectedIssuer(),
    audience: getExpectedAudience(),
  };
}

function getExpectedIssuer(): string {
  const explicitIssuer = process.env.SUPABASE_JWT_ISSUER?.trim();
  if (explicitIssuer) {
    return explicitIssuer;
  }
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error('Either SUPABASE_JWT_ISSUER or SUPABASE_URL is required for auth middleware');
  }
  return `${supabaseUrl}/auth/v1`;
}

function getExpectedAudience(): string {
  return process.env.SUPABASE_JWT_AUDIENCE?.trim() || DEFAULT_AUDIENCE;
}

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required for JWKS token verification');
  }
  return supabaseUrl;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return null;
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token.trim();
}

function isLocalhostHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function shouldIgnoreExpirationForRequest(req: Request): boolean {
  if (process.env.AUTH_IGNORE_EXPIRATION_ON_LOCALHOST !== 'true') {
    return false;
  }
  return isLocalhostHost(req.hostname);
}

function authDebugEnabled(): boolean {
  return process.env.AUTH_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
}

function tokenFingerprint(token: string): string {
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

function formatUnixTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return new Date(value * 1000).toISOString();
}

function logAuthWarning(req: Request, message: string, details?: Record<string, string | undefined>): void {
  if (!authDebugEnabled()) {
    return;
  }

  const extras = details
    ? Object.entries(details)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join(' ')
    : '';

  Logger.warning(`[auth] ${req.method} ${req.path} - ${message}${extras ? ` (${extras})` : ''}`);
}

/**
 * Use native dynamic import so Node can load ESM-only jose and bundlers can still
 * statically detect the dependency for Lambda packaging.
 */
const importJose = () => import('jose');

async function verifyWithJwks(token: string, options?: { ignoreExpiration?: boolean }): Promise<JwtPayload> {
  const issuer = getExpectedIssuer();
  const audience = getExpectedAudience();
  const supabaseUrl = getSupabaseUrl();
  const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

  const jose = await importJose();
  const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
  const verifyOptions: Parameters<typeof jose.jwtVerify>[2] = {
    issuer,
    audience,
  };

  if (options?.ignoreExpiration) {
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (typeof decoded?.exp === 'number' && Number.isFinite(decoded.exp)) {
      const nearExpiryDate = new Date((decoded.exp - 1) * 1000);
      verifyOptions.currentDate = nearExpiryDate;
    }
  }

  const { payload } = await jose.jwtVerify(token, JWKS, verifyOptions);

  return payload as JwtPayload;
}

async function verifyToken(token: string, options?: { ignoreExpiration?: boolean }): Promise<JwtPayload> {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (jwtSecret) {
    const issuer = getExpectedIssuer();
    const audience = getExpectedAudience();
    return jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer,
      audience,
      ignoreExpiration: options?.ignoreExpiration === true,
    }) as JwtPayload;
  }

  return verifyWithJwks(token, options);
}

export async function requireSupabaseAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getBearerToken(req);
  if (!token) {
    logAuthWarning(req, 'missing bearer token', {
      hasAuthorizationHeader: req.header('authorization') ? 'true' : 'false',
    });
    res.status(401).json({
      error: { status: 401, message: 'Missing bearer token' },
    });
    return;
  }

  try {
    const ignoreExpiration = shouldIgnoreExpirationForRequest(req);
    const payload = await verifyToken(token, { ignoreExpiration });
    const userId = payload.sub;
    if (!userId || typeof userId !== 'string') {
      logAuthWarning(req, 'token missing subject claim', {
        token: tokenFingerprint(token),
      });
      res.status(401).json({
        error: { status: 401, message: 'Token missing subject' },
      });
      return;
    }

    const email = typeof payload.email === 'string' ? payload.email : null;
    (req as RequestWithUser).user = { id: userId, email };
    next();
  } catch (error) {
    const decoded = jwt.decode(token) as JwtPayload | null;
    const decodedAudience = Array.isArray(decoded?.aud)
      ? decoded?.aud.join(',')
      : typeof decoded?.aud === 'string'
        ? decoded.aud
        : undefined;
    const expectedIssuer = process.env.SUPABASE_JWT_ISSUER?.trim() || `${process.env.SUPABASE_URL?.trim() || '<missing-supabase-url>'}/auth/v1`;
    logAuthWarning(req, 'token verification failed', {
      token: tokenFingerprint(token),
      reason: error instanceof Error ? error.message : 'unknown',
      expectedIssuer,
      expectedAudience: process.env.SUPABASE_JWT_AUDIENCE?.trim() || DEFAULT_AUDIENCE,
      decodedIssuer: typeof decoded?.iss === 'string' ? decoded.iss : undefined,
      decodedAudience,
      decodedExpiresAt: formatUnixTimestamp(decoded?.exp),
      decodedSubject: typeof decoded?.sub === 'string' ? decoded.sub : undefined,
      ignoreExpirationForLocalhost: shouldIgnoreExpirationForRequest(req) ? 'true' : 'false',
      hasJwtSecret: process.env.SUPABASE_JWT_SECRET?.trim() ? 'true' : 'false',
      usingJwksFallback: process.env.SUPABASE_JWT_SECRET?.trim() ? 'false' : 'true',
    });
    res.status(401).json({
      error: { status: 401, message: 'Invalid or expired token' },
    });
  }
}
