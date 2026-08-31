import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { SportModel } from '../../src/modules/sports/sport.model.js';
import { seedSports, OFFICIAL_SPORTS } from '../../src/modules/sports/sport.seed.js';

describe('Sports Module Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await SportModel.deleteMany({});
  });

  it('seedSports deve inserir os 8 esportes oficiais no banco de forma idempotente', async () => {
    await seedSports();
    const countFirst = await SportModel.countDocuments();
    expect(countFirst).toBe(8);

    // Executar novamente não deve duplicar registros
    await seedSports();
    const countSecond = await SportModel.countDocuments();
    expect(countSecond).toBe(8);
  });

  it('GET /api/sports deve retornar lista dos esportes ativos ordenados', async () => {
    await seedSports();

    const res = await request(app).get('/api/sports');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sports');
    expect(Array.isArray(res.body.sports)).toBe(true);
    expect(res.body.sports.length).toBe(8);

    const keys = res.body.sports.map((s: any) => s.sportKey);
    expect(keys).toEqual(['running', 'football', 'futevolei', 'boxing', 'strength', 'swimming', 'cycling', 'jiujitsu']);
  });
});
