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
import { sportRoutes } from './modules/sports/sport.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { sessionRoutes } from './modules/sessions/session.routes.js';
import { goalRoutes } from './modules/goals/goal.routes.js';
import { progressRoutes } from './modules/progress/progress.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import exportRoutes from './modules/export/export.routes.js';
import insightRoutes from './modules/insights/insight.routes.js';
import { shoeRoutes } from './modules/shoes/shoe.routes.js';
import { strengthRoutes } from './modules/strength/strength-session.routes.js';

export const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    // Permite que browsers em domínios diferentes (Cloudflare Pages → Railway API)
    // acessem os recursos. Sem isso, o CORP bloqueia cookies e respostas cross-origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Manter as demais proteções ativas
    crossOriginOpenerPolicy: false,
  })
);
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

// Rotas de Domínio
app.use('/api/sports', sportRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/shoes', shoeRoutes);

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
