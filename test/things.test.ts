import request from 'supertest';
import { createTestApp } from './setup';

describe('Things API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  it('creates, lists, gets, updates, and deletes a thing', async () => {
    const created = await request(app)
      .post('/things')
      .send({ name: ' Alpha ' })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(created.body).toMatchObject({
      name: 'Alpha',
    });
    expect(created.body.id).toMatch(/^thing-/);
    expect(created.body.createdAt).toBeDefined();

    const id = created.body.id as string;

    const list = await request(app).get('/things').expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((t: { id: string }) => t.id === id)).toBe(true);

    const one = await request(app).get(`/things/${id}`).expect(200);
    expect(one.body.name).toBe('Alpha');

    const updated = await request(app)
      .put(`/things/${id}`)
      .send({ name: 'Beta' })
      .expect(200);
    expect(updated.body.name).toBe('Beta');

    await request(app).delete(`/things/${id}`).expect(204);

    await request(app).get(`/things/${id}`).expect(404);
    await request(app)
      .put(`/things/${id}`)
      .send({ name: 'Gamma' })
      .expect(404);
    await request(app).delete(`/things/${id}`).expect(404);
  });

  it('rejects empty name on create', async () => {
    const res = await request(app).post('/things').send({ name: '   ' }).expect(400);
    expect(res.body.error.code).toBe('THING_NAME_INVALID');
  });

  it('rejects missing name on create', async () => {
    await request(app).post('/things').send({}).expect(400);
  });
});
