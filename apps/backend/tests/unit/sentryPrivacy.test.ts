import { describe, it, expect } from 'vitest';
import { scrubSensitiveData } from '../../src/instrument.js';

describe('Sentry Data Scrubbing & PII Privacy Tests', () => {
  it('deve mascarar campos sensíveis como senhas, tokens e emails', () => {
    const payload = {
      email: 'atleta@example.com',
      password: 'SuperSecretPassword123!',
      token: 'bearer_token_xyz',
      apiKey: 'secret_api_key',
      sportKey: 'running',
      durationSeconds: 1800,
    };

    const clean = scrubSensitiveData(payload);

    expect(clean.password).toBe('[REDACTED]');
    expect(clean.email).toBe('[REDACTED]');
    expect(clean.token).toBe('[REDACTED]');
    expect(clean.apiKey).toBe('[REDACTED]');
    expect(clean.sportKey).toBe('running');
    expect(clean.durationSeconds).toBe(1800);
  });

  it('deve mascarar recursivamente objetos aninhados e arrays', () => {
    const payload = {
      user: {
        id: 'u_123',
        notes: 'Informação médica confidencial ou anotação pessoal',
        auth: {
          currentPassword: 'old_password_123',
          cookie: 'session_cookie=abc',
        },
      },
      metrics: [{ distanceKm: 10, notes: 'treino na chuva' }],
    };

    const clean = scrubSensitiveData(payload);

    expect(clean.user.id).toBe('u_123');
    expect(clean.user.notes).toBe('[REDACTED]');
    expect(clean.user.auth.currentPassword).toBe('[REDACTED]');
    expect(clean.user.auth.cookie).toBe('[REDACTED]');
    expect(clean.metrics[0].distanceKm).toBe(10);
    expect(clean.metrics[0].notes).toBe('[REDACTED]');
  });

  it('deve lidar com valores primitivos, nulos ou indefinidos sem quebrar', () => {
    expect(scrubSensitiveData(null)).toBeNull();
    expect(scrubSensitiveData(undefined)).toBeUndefined();
    expect(scrubSensitiveData('texto')).toBe('texto');
    expect(scrubSensitiveData(123)).toBe(123);
  });
});
