import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { auth } from '../../src/config/auth.js';
import { InjuryModel } from '../../src/modules/injuries/injury.model.js';

describe('Injuries API', () => {
  let mongoServer: MongoMemoryServer;
  let userId = 'usr_injury_123';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await InjuryModel.deleteMany({});
    userId = 'usr_injury_123';
    vi.spyOn(auth.api, 'getSession').mockImplementation(async () => ({
      session: { id: 'test-session', userId, expiresAt: new Date(Date.now() + 3600), createdAt: new Date(), updatedAt: new Date(), token: 'token' },
      user: { id: userId, email: 'test@pacelog.app', name: 'Test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    }) as any);
  });

  it('requires authentication', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as any);
    const res = await request(app).get('/api/injuries');
    expect(res.status).toBe(401);
  });

  it('creates and lists injuries with initial history', async () => {
    const created = await request(app).post('/api/injuries').send({
      region: 'ombro',
      side: 'left',
      severity: 7,
      category: 'tendon_overload',
    });
    expect(created.status).toBe(201);
    expect(created.body.region).toBe('ombro');
    expect(created.body.history).toHaveLength(1);

    const listed = await request(app).get('/api/injuries');
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);
  });

  it('updates severity/status and appends evolution history', async () => {
    const created = await request(app).post('/api/injuries').send({
      region: 'joelho',
      side: 'right',
      severity: 8,
      category: 'joint_discomfort',
    });
    const updated = await request(app).patch(`/api/injuries/${created.body.id}`).send({
      severity: 3,
      status: 'recovering',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.severity).toBe(3);
    expect(updated.body.status).toBe('recovering');
    expect(updated.body.history).toHaveLength(2);
  });

  it('isolates records by userId and deletes by owner', async () => {
    await InjuryModel.create({
      userId: 'other_user',
      region: 'lombar',
      side: 'center',
      severity: 5,
      category: 'soreness_doms',
      status: 'active',
      occurredAt: new Date(),
      history: [],
    });
    const created = await request(app).post('/api/injuries').send({
      region: 'quadril',
      side: 'left',
      severity: 4,
      category: 'other',
    });

    const listed = await request(app).get('/api/injuries');
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].region).toBe('quadril');

    vi.mocked(auth.api.getSession).mockImplementationOnce(async () => ({
      session: { id: 'other-session', userId: 'other_user', expiresAt: new Date(Date.now() + 3600), createdAt: new Date(), updatedAt: new Date(), token: 'token' },
      user: { id: 'other_user', email: 'other@pacelog.app', name: 'Other', emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    }) as any);
    const deletedAsOther = await request(app).delete(`/api/injuries/${created.body.id}`);
    expect(deletedAsOther.status).toBe(404);

    const deleted = await request(app).delete(`/api/injuries/${created.body.id}`);
    expect(deleted.status).toBe(204);
  });
});
