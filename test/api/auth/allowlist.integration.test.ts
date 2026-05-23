import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestAppWithContainer } from '../setup';
import { createAuthToken } from '../support/authToken';
import type { StubAllowedEmailRepository } from '../support/StubAllowedEmailRepository';

describe('Email allowlist gate (integration)', () => {
  let envBackup: string | undefined;

  beforeEach(() => {
    envBackup = process.env.EMAIL_ALLOWLIST_ENABLED;
    process.env.EMAIL_ALLOWLIST_ENABLED = 'true';
  });

  afterEach(() => {
    if (envBackup === undefined) {
      delete process.env.EMAIL_ALLOWLIST_ENABLED;
    } else {
      process.env.EMAIL_ALLOWLIST_ENABLED = envBackup;
    }
  });

  function allowlistRepo(container: { getAllowedEmailRepository: () => unknown }): StubAllowedEmailRepository {
    return container.getAllowedEmailRepository() as StubAllowedEmailRepository;
  }

  it('returns 403 EMAIL_NOT_APPROVED when the authenticated email is not on the allowlist', async () => {
    const { app, container } = createTestAppWithContainer();
    allowlistRepo(container).setAllowed(['friend@example.com']);

    const token = await createAuthToken('user-stranger', 'stranger@example.com');
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error).toMatchObject({
      status: 403,
      code: 'EMAIL_NOT_APPROVED',
    });
  });

  it('lets approved emails through to protected routes', async () => {
    const { app, container } = createTestAppWithContainer();
    allowlistRepo(container).setAllowed(['friend@example.com']);

    const token = await createAuthToken('user-friend', 'friend@example.com');
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({ id: 'user-friend', email: 'friend@example.com' });
  });

  it('enforces allowlist on /things with the same shared middleware cache as /profile', async () => {
    const { app, container } = createTestAppWithContainer();
    allowlistRepo(container).setAllowed(['friend@example.com']);

    const token = await createAuthToken('user-stranger', 'stranger@example.com');
    await request(app)
      .get('/things')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    const friendToken = await createAuthToken('user-friend', 'friend@example.com');
    await request(app)
      .get('/things')
      .set('Authorization', `Bearer ${friendToken}`)
      .expect(200);
  });

  it('blocks tokens that have no email claim even when the JWT is valid', async () => {
    const { app, container } = createTestAppWithContainer();
    allowlistRepo(container).setAllowed(['friend@example.com']);

    const token = jwt.sign(
      {
        sub: 'no-email',
        iss: process.env.SUPABASE_JWT_ISSUER,
        aud: process.env.SUPABASE_JWT_AUDIENCE,
      },
      process.env.SUPABASE_JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('EMAIL_NOT_APPROVED');
  });

  it('lets all authenticated requests through when EMAIL_ALLOWLIST_ENABLED is off', async () => {
    process.env.EMAIL_ALLOWLIST_ENABLED = 'false';
    const { app, container } = createTestAppWithContainer();
    allowlistRepo(container).setAllowed(['only-this-one@example.com']);

    const token = await createAuthToken('user-stranger', 'stranger@example.com');
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({ id: 'user-stranger', email: 'stranger@example.com' });
  });
});
