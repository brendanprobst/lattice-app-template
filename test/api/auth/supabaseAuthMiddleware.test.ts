import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireSupabaseAuth } from '@api/auth/supabaseAuthMiddleware';
import { Logger } from '@api/utils/logger';
import type { RequestWithUser } from '@api/auth/types';
import { createAuthToken } from '../support/authToken';

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_JWT_SECRET',
  'SUPABASE_JWT_ISSUER',
  'SUPABASE_JWT_AUDIENCE',
] as const;

describe('requireSupabaseAuth', () => {
  let envBackup: Record<string, string | undefined>;

  beforeEach(() => {
    jest.spyOn(Logger, 'warning').mockImplementation(() => {});
    envBackup = {};
    for (const k of ENV_KEYS) {
      envBackup[k] = process.env[k];
    }
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret';
    process.env.SUPABASE_JWT_ISSUER = 'https://test-project.supabase.co/auth/v1';
    process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const k of ENV_KEYS) {
      const v = envBackup[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  });

  function makeReq(authHeader: string | undefined): Request {
    return {
      method: 'GET',
      path: '/profile',
      header: jest.fn((name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return authHeader;
        }
        return undefined;
      }),
    } as unknown as Request;
  }

  function makeRes(): Response & { status: jest.Mock; json: jest.Mock } {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
  }

  it('responds 401 when Authorization header is missing', async () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { status: 401, message: 'Missing bearer token' },
    });
  });

  it('responds 401 when scheme is not Bearer', async () => {
    const req = makeReq('Basic abc');
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responds 401 when Bearer token is empty', async () => {
    const req = makeReq('Bearer ');
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next and attaches user when token is valid', async () => {
    const token = await createAuthToken('user-abc', 'u@example.com');
    const req = makeReq(`Bearer ${token}`) as RequestWithUser;
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user-abc', email: 'u@example.com' });
  });

  it('sets email to null when token has no email claim', async () => {
    const token = jwt.sign(
      {
        sub: 'sub-only',
        iss: process.env.SUPABASE_JWT_ISSUER,
        aud: process.env.SUPABASE_JWT_AUDIENCE,
      },
      process.env.SUPABASE_JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
    const req = makeReq(`Bearer ${token}`) as RequestWithUser;
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'sub-only', email: null });
  });

  it('responds 401 when subject claim is missing', async () => {
    const token = jwt.sign(
      {
        email: 'a@b.com',
        iss: process.env.SUPABASE_JWT_ISSUER,
        aud: process.env.SUPABASE_JWT_AUDIENCE,
      },
      process.env.SUPABASE_JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { status: 401, message: 'Token missing subject' },
    });
  });

  it('responds 401 when token signature is invalid', async () => {
    const token = await createAuthToken('x', 'y@z.com');
    const tampered = `${token.slice(0, -4)}xxxx`;
    const req = makeReq(`Bearer ${tampered}`);
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { status: 401, message: 'Invalid or expired token' },
    });
  });

  it('responds 401 when token is expired', async () => {
    const token = jwt.sign(
      {
        sub: 'exp-user',
        iss: process.env.SUPABASE_JWT_ISSUER,
        aud: process.env.SUPABASE_JWT_AUDIENCE,
      },
      process.env.SUPABASE_JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '-10s' },
    );
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { status: 401, message: 'Invalid or expired token' },
    });
  });

  it('responds 401 when issuer does not match', async () => {
    const token = jwt.sign(
      {
        sub: 'user',
        iss: 'https://wrong-issuer.example/auth/v1',
        aud: process.env.SUPABASE_JWT_AUDIENCE,
      },
      process.env.SUPABASE_JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responds 401 when audience does not match', async () => {
    const token = jwt.sign(
      {
        sub: 'user',
        iss: process.env.SUPABASE_JWT_ISSUER,
        aud: 'wrong-audience',
      },
      process.env.SUPABASE_JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts Bearer prefix case-insensitively', async () => {
    const token = await createAuthToken('case-user', 'case@example.com');
    const req = makeReq(`bearer ${token}`) as RequestWithUser;
    const res = makeRes();
    const next = jest.fn();

    await requireSupabaseAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('case-user');
  });
});
