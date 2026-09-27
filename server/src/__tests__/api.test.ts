import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';

let app: ReturnType<typeof createApp>;
beforeEach(() => {
  app = createApp(createDb(':memory:')); // fresh, isolated database per test
});

const create = async (path: 'clinicians' | 'patients', name: string) =>
  (await request(app).post(`/api/${path}`).send({ name }).expect(201)).body.id as number;

const addVisit = (clinicianId: number, patientId: number, visitedAt: string, notes?: string) =>
  request(app).post('/api/visits').send({ clinicianId, patientId, visitedAt, notes });

describe('visits', () => {
  it('creates a visit and returns joined names', async () => {
    const c = await create('clinicians', 'Dr. A');
    const p = await create('patients', 'John');
    const res = await addVisit(c, p, '2026-09-20T10:00:00Z', 'Dressing changed');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ clinicianName: 'Dr. A', patientName: 'John', notes: 'Dressing changed' });
  });

  it('lists newest first, with id as tiebreaker', async () => {
    const c = await create('clinicians', 'Dr. A');
    const p = await create('patients', 'John');
    for (const t of ['2026-09-01T10:00:00Z', '2026-09-03T10:00:00Z', '2026-09-02T10:00:00Z', '2026-09-03T10:00:00Z']) {
      await addVisit(c, p, t).expect(201);
    }
    const { body } = await request(app).get('/api/visits').expect(200);
    expect(body.map((v: { id: number }) => v.id)).toEqual([4, 2, 3, 1]);
  });

  it('returns 422 for an unknown clinician', async () => {
    const p = await create('patients', 'John');
    const res = await addVisit(999, p, '2026-09-20T10:00:00Z');
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Clinician does not exist');
  });


  describe('clinicians and patients', () => {
  it('creates and lists, sorted by name, with visit stats', async () => {
    await create('clinicians', 'Zed');
    await create('clinicians', 'amy');
    const { body } = await request(app).get('/api/clinicians').expect(200);
    expect(body.map((c: { name: string }) => c.name)).toEqual(['amy', 'Zed']);
    expect(body[0]).toMatchObject({ visitCount: 0, lastVisitAt: null });
  });

  it('rejects blank names', async () => {
    const res = await request(app).post('/api/patients').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toBe('name');
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).get('/api/patients/999').expect(404);
  });
});

describe('more visits', () => {
  it('filters by clinician, by patient, and by both', async () => {
    const c1 = await create('clinicians', 'Dr. A');
    const c2 = await create('clinicians', 'Dr. B');
    const p1 = await create('patients', 'John');
    const p2 = await create('patients', 'Maria');
    const t = '2026-09-20T10:00:00Z';
    await addVisit(c1, p1, t);
    await addVisit(c2, p1, t);
    await addVisit(c2, p2, t);

    const get = async (qs: string) => (await request(app).get(`/api/visits?${qs}`).expect(200)).body;
    expect(await get(`clinicianId=${c2}`)).toHaveLength(2);
    expect(await get(`patientId=${p1}`)).toHaveLength(2);
    expect(await get(`clinicianId=${c2}&patientId=${p1}`)).toHaveLength(1);
  });

  it('updates visit stats on the people lists', async () => {
    const c = await create('clinicians', 'Dr. A');
    const p = await create('patients', 'John');
    await addVisit(c, p, '2026-09-01T10:00:00Z');
    await addVisit(c, p, '2026-09-05T10:00:00Z');
    const { body } = await request(app).get('/api/patients').expect(200);
    expect(body[0]).toMatchObject({ visitCount: 2, lastVisitAt: '2026-09-05T10:00:00.000Z' });
  });

  it('normalises offsets to UTC', async () => {
    const c = await create('clinicians', 'Dr. A');
    const p = await create('patients', 'John');
    const res = await addVisit(c, p, '2026-09-20T10:00:00+05:30');
    expect(res.body.visitedAt).toBe('2026-09-20T04:30:00.000Z');
  });

  it('rejects visits in the future', async () => {
    const c = await create('clinicians', 'Dr. A');
    const p = await create('patients', 'John');
    const res = await addVisit(c, p, new Date(Date.now() + 86_400_000).toISOString());
    expect(res.status).toBe(400);
  });

  it('returns 400 with details for an invalid payload', async () => {
    const res = await request(app).post('/api/visits').send({ clinicianId: 'x', visitedAt: 'yesterday' });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/api/visits').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
});

})
