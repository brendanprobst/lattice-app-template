import type { Request, Response } from 'express';
import { isEmailAllowlistEnabled, requireAllowedEmail } from '@api/auth/requireAllowedEmail';
import { Logger } from '@api/utils/logger';
import type { IAllowedEmailRepository } from '@api/domain/repositories/IAllowedEmailRepository';
import type { RequestWithUser } from '@api/auth/types';

function makeReq(user: RequestWithUser['user'] | null): Request {
  return { user } as unknown as Request;
}

function makeRes(): Response & { status: jest.Mock; json: jest.Mock } {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

class StubRepository implements IAllowedEmailRepository {
  isAllowed = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
}

describe('requireAllowedEmail', () => {
  let envBackup: string | undefined;

  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => {});
    envBackup = process.env.EMAIL_ALLOWLIST_ENABLED;
    process.env.EMAIL_ALLOWLIST_ENABLED = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (envBackup === undefined) {
      delete process.env.EMAIL_ALLOWLIST_ENABLED;
    } else {
      process.env.EMAIL_ALLOWLIST_ENABLED = envBackup;
    }
  });

  it('calls next when the email is on the allowlist', async () => {
    const repo = new StubRepository();
    repo.isAllowed.mockResolvedValueOnce(true);
    const middleware = requireAllowedEmail(repo);
    const req = makeReq({ id: 'u1', email: 'friend@example.com' });
    const res = makeRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(repo.isAllowed).toHaveBeenCalledWith('friend@example.com');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 403 EMAIL_NOT_APPROVED when the email is not on the allowlist', async () => {
    const repo = new StubRepository();
    repo.isAllowed.mockResolvedValueOnce(false);
    const middleware = requireAllowedEmail(repo);
    const req = makeReq({ id: 'u1', email: 'stranger@example.com' });
    const res = makeRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { status: 403, code: 'EMAIL_NOT_APPROVED', message: 'Account email is not approved for access.' },
    });
  });

  it('returns a pass-through when EMAIL_ALLOWLIST_ENABLED is unset', async () => {
    delete process.env.EMAIL_ALLOWLIST_ENABLED;
    const repo = new StubRepository();
    const middleware = requireAllowedEmail(repo);
    const next = jest.fn();

    await middleware(makeReq({ id: 'u1', email: 'whoever@example.com' }), makeRes(), next);

    expect(repo.isAllowed).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  describe('isEmailAllowlistEnabled', () => {
    it('returns true for case-insensitive true and for 1', () => {
      process.env.EMAIL_ALLOWLIST_ENABLED = 'true';
      expect(isEmailAllowlistEnabled()).toBe(true);
      process.env.EMAIL_ALLOWLIST_ENABLED = 'TRUE';
      expect(isEmailAllowlistEnabled()).toBe(true);
      process.env.EMAIL_ALLOWLIST_ENABLED = '1';
      expect(isEmailAllowlistEnabled()).toBe(true);
      process.env.EMAIL_ALLOWLIST_ENABLED = 'false';
      expect(isEmailAllowlistEnabled()).toBe(false);
      delete process.env.EMAIL_ALLOWLIST_ENABLED;
      expect(isEmailAllowlistEnabled()).toBe(false);
    });
  });
});
