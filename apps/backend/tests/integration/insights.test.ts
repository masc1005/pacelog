import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { InsightModel } from '../../src/modules/insights/insight.model.js';
import { auth } from '../../src/config/auth.js';
import { GoogleGenAI } from '@google/genai';

// Mock the Gemini SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: 'MOCK_INSIGHT: Continue treinando duro. O seu ACWR está excelente.'
          })
        }
      };
    })
  };
});

describe('Insights API', () => {
  let mongoServer: MongoMemoryServer;
  const userId = 'usr_insight_123';

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
    await InsightModel.deleteMany({});
  });

  it('should generate a new daily insight if none exists', async () => {
    const res = await request(app).get('/api/insights/daily');
    
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('daily_coach');
    
    // As we mock Gemini or use the fallback (if env is empty), we just check it returns a string
    expect(res.body.data.content).toBeDefined();
    
    const count = await InsightModel.countDocuments({ userId });
    expect(count).toBe(1);
  });

  it('should return the cached insight if one was already generated today', async () => {
    await InsightModel.create({
      userId,
      content: 'CACHED_INSIGHT',
      type: 'daily_coach',
    });

    const res = await request(app).get('/api/insights/daily');
    
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('CACHED_INSIGHT');
    
    const count = await InsightModel.countDocuments({ userId });
    expect(count).toBe(1); // Should not create a new one
  });
});
