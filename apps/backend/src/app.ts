import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';
import { HttpError } from './utils/httpError.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como mobile apps, curl, postman) ou origens confiáveis
      if (!origin || origin === env.APP_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissivo em dev/staging
      }
    },
    credentials: true,
  })
);

// Rate limiting (não bloqueia rotas de teste/health)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/favicon.ico',
});
app.use(limiter);

// Better Auth processa o stream de requisição bruto antes do express.json()
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json({ limit: '5mb' }));

// Health check para Railway, Docker e monitoramento
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'pacelog-api',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Endpoint de teste de captura de exceção para validação de observabilidade (Sentry)
app.get('/api/test-error', (req) => {
  if (req.query.type === 'operational') {
    throw new HttpError(400, 'TEST_OPERATIONAL_ERROR', { field: 'test', reason: 'invalid' });
  }
  throw new Error('Test unexpected exception for Sentry validation');
});

// Setup Sentry error handler se disponível
if (typeof (Sentry as any).setupExpressErrorHandler === 'function') {
  (Sentry as any).setupExpressErrorHandler(app);
}

// Handler centralizado de erros da aplicação
app.use(errorHandler);
