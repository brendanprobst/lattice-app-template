import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RequestWithUser } from './types';
import { Logger } from '../utils/logger';

const DEFAULT_AUDIENCE = 'authenticated';

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

function authDebugEnabled(): boolean {
  return process.env.AUTH_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
}

function tokenFingerprint(token: string): string {
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
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
 * Load ESM-only jose from a CommonJS build without transpiling to require().
 */
const importJose = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;

async function verifyWithJwks(token: string): Promise<JwtPayload> {
  const issuer = getExpectedIssuer();
  const audience = getExpectedAudience();
  const supabaseUrl = getSupabaseUrl();
  const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

  const jose = await importJose('jose');
  const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer,
    audience,
  });

  return payload as JwtPayload;
}

async function verifyToken(token: string): Promise<JwtPayload> {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (jwtSecret) {
    const issuer = getExpectedIssuer();
    const audience = getExpectedAudience();
    return jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer,
      audience,
    }) as JwtPayload;
  }

  return verifyWithJwks(token);
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
    const payload = await verifyToken(token);
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
    const expectedIssuer = process.env.SUPABASE_JWT_ISSUER?.trim() || `${process.env.SUPABASE_URL?.trim() || '<missing-supabase-url>'}/auth/v1`;
    logAuthWarning(req, 'token verification failed', {
      token: tokenFingerprint(token),
      reason: error instanceof Error ? error.message : 'unknown',
      expectedIssuer,
      expectedAudience: process.env.SUPABASE_JWT_AUDIENCE?.trim() || DEFAULT_AUDIENCE,
      hasJwtSecret: process.env.SUPABASE_JWT_SECRET?.trim() ? 'true' : 'false',
      usingJwksFallback: process.env.SUPABASE_JWT_SECRET?.trim() ? 'false' : 'true',
    });
    res.status(401).json({
      error: { status: 401, message: 'Invalid or expired token' },
    });
  }
}
