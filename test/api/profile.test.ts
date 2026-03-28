import request from 'supertest';
import { createTestApp } from './setup';
import { createAuthToken } from './support/authToken';

describe('Profile API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns authenticated profile claims', async () => {
    const token = await createAuthToken('user-123', 'person@example.com');
    const response = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: 'user-123',
      email: 'person@example.com',
    });
  });

  it('returns 401 when token is missing', async () => {
    await request(app).get('/profile').expect(401);
  });
});
