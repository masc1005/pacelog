import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Health Check & Error Handling Integration Tests', () => {
  it('GET /health deve responder 200 com status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'pacelog-api');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /rota-inexistente deve retornar 404', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
  });

  it('GET /api/test-error com erro operacional deve retornar 400 com detalhes', async () => {
    const res = await request(app).get('/api/test-error?type=operational');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'TEST_OPERATIONAL_ERROR',
      details: {
        field: 'test',
        reason: 'invalid',
      },
    });
  });

  it('GET /api/test-error com erro inesperado deve responder 500 sem vazar stack trace', async () => {
    const res = await request(app).get('/api/test-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'INTERNAL_ERROR',
    });
  });
});
