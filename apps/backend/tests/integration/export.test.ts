import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { SessionModel } from '../../src/modules/sessions/session.model.js';
import { PhysiqueAssessmentModel } from '../../src/modules/physique/physique.model.js';
import { auth } from '../../src/config/auth.js';

describe('Export API', () => {
  let mongoServer: MongoMemoryServer;
  const userId = 'usr_export_123';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    vi.spyOn(auth.api, 'getSession').mockImplementation(async () => {
      return {
        session: { id: 'test-session', userId, expiresAt: new Date(Date.now() + 3600), createdAt: new Date(), updatedAt: new Date(), token: 'token' },
        user: { id: userId, email: 'test@pacelog.app', name: 'Test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      } as any;
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await Promise.all([
      SessionModel.deleteMany({}),
      PhysiqueAssessmentModel.deleteMany({}),
    ]);
  });

  it('should export sessions as CSV', async () => {
    await SessionModel.create({
      userId,
      sportKey: 'running',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      durationSeconds: 1800,
      rpe: 5,
      sessionalLoad: 150,
      status: 'completed',
      metrics: { distanceMeters: 5000 }
    });

    const res = await request(app).get('/api/export/sessions.csv');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.text).toContain('running');
    expect(res.text).toContain('1800');
    expect(res.text).toContain('distanceMeters');
  });

  it('should export sessions as JSON', async () => {
    await SessionModel.create({
      userId,
      sportKey: 'strength',
      startedAt: new Date('2024-01-02T10:00:00Z'),
      durationSeconds: 3600,
      rpe: 8,
      sessionalLoad: 480,
      status: 'completed',
      metrics: { totalVolumeKg: 2000 }
    });

    const res = await request(app).get('/api/export/sessions.json');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0].sportKey).toBe('strength');
    expect(res.body[0].metrics.totalVolumeKg).toBe(2000);
  });

  it('should include physiqueAssessments in full backup JSON', async () => {
    await PhysiqueAssessmentModel.create({
      userId,
      heightCm: 179,
      weightKg: 78,
      goal: 'hypertrophy',
      biologicalSex: 'male',
      age: 29,
      result: {
        imageQualityCheck: { isAssessable: true },
        spatialCalibration: {
          detectedReferenceObjects: ['Batente ~210cm'],
          perspectiveDistortionNote: 'Calibrado',
          calibrationConfidence: 'high',
        },
        anthropometryEstimate: {
          bmi: 24.3,
          estimatedBodyFatRange: { min: 13, max: 16 },
          waistToShoulderVisualRatio: '1:1.45',
        },
        physiqueSummary: 'Bom equilíbrio geral',
        strongPoints: [{ muscleGroup: 'peito', note: 'Densidade adequada' }],
        weakPoints: [
          {
            muscleGroup: 'ombros',
            priority: 'high',
            technicalReason: 'Deltoide lateral subdesenvolvido',
            targetWeeklySets: 16,
            recommendedExerciseNames: ['Elevação Lateral (Halteres)'],
          },
        ],
        posturalObservations: [],
        recommendedSplit: 'Upper/Lower',
      },
    });

    const res = await request(app).get('/api/export/backup.json');
    expect(res.status).toBe(200);
    expect(res.body.physiqueAssessments).toBeInstanceOf(Array);
    expect(res.body.physiqueAssessments).toHaveLength(1);
    expect(res.body.physiqueAssessments[0].heightCm).toBe(179);
    expect(res.body.physiqueAssessments[0].result.physiqueSummary).toBe('Bom equilíbrio geral');
  });

  it('should generate weekly report', async () => {
    const res = await request(app).get('/api/export/weekly-report');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.weekLabel).toBe('Últimos 7 Dias');
    expect(res.body.data.acwr).toBeDefined();
    expect(res.body.data.goalsAchieved).toBe(0);
  });
});
