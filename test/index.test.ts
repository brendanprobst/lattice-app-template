import request from 'supertest';
import { createTestApp } from './setup';

describe('GET /', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });
  it('should return API information', async () => {
    const response = await request(app)
      .get('/')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('version');
    expect(response.body.message).toBe('DDD API Template');
    expect(response.body.version).toBe('1.0.0');
  });

  it('should return JSON format', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/json/);
    expect(typeof response.body).toBe('object');
  });
});
