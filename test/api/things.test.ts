import request from 'supertest';
import { createTestApp } from './setup';
import { createAuthToken } from './support/authToken';

describe('Things API', () => {
  let app: ReturnType<typeof createTestApp>;
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    app = createTestApp();
    const token = await createAuthToken();
    authHeader = { Authorization: `Bearer ${token}` };
  });

  it('creates, lists, gets, updates, and deletes a thing', async () => {
    const created = await request(app)
      .post('/things')
      .set(authHeader)
      .send({ name: ' Alpha ' })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(created.body).toMatchObject({
      name: 'Alpha',
    });
    expect(created.body.id).toEqual(expect.any(Number));
    expect(created.body.createdAt).toBeDefined();

    const id = created.body.id as number;

    const list = await request(app).get('/things').set(authHeader).expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((t: { id: number }) => t.id === id)).toBe(true);

    const one = await request(app).get(`/things/${id}`).set(authHeader).expect(200);
    expect(one.body.name).toBe('Alpha');

    const updated = await request(app)
      .put(`/things/${id}`)
      .set(authHeader)
      .send({ name: 'Beta' })
      .expect(200);
    expect(updated.body.name).toBe('Beta');

    await request(app).delete(`/things/${id}`).set(authHeader).expect(204);

    await request(app).get(`/things/${id}`).set(authHeader).expect(404);
    await request(app)
      .put(`/things/${id}`)
      .set(authHeader)
      .send({ name: 'Gamma' })
      .expect(404);
    await request(app).delete(`/things/${id}`).set(authHeader).expect(404);
  });

  it('rejects empty name on create', async () => {
    const res = await request(app)
      .post('/things')
      .set(authHeader)
      .send({ name: '   ' })
      .expect(400);
    expect(res.body.error.code).toBe('THING_NAME_INVALID');
  });

  it('rejects missing name on create', async () => {
    await request(app).post('/things').set(authHeader).send({}).expect(400);
  });

  it('rejects unauthenticated request', async () => {
    await request(app).get('/things').expect(401);
  });
});
