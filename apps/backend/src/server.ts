// instrument.ts DEVE ser o primeiríssimo import da aplicação para inicializar o Sentry
import './instrument.js';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { seedSports } from './modules/sports/sport.seed.js';
import { seedExercises } from './modules/strength/exercise.seed.js';
import { syncCompletedStrengthSessions } from './modules/strength/strength-session.service.js';
import { logger } from './utils/logger.js';

const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos (Render hiberna após 15 min)

function startKeepAlive() {
  const publicUrl = process.env.RENDER_EXTERNAL_URL || env.BETTER_AUTH_URL;
  if (!publicUrl || publicUrl.includes('localhost') || publicUrl.includes('127.0.0.1')) {
    return;
  }

  const pingUrl = `${publicUrl.replace(/\/+$/, '')}/ping`;
  logger.info(`⏰ Keep-Alive ativado: pingando ${pingUrl} a cada 10 minutos`);

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl);
      logger.info(`💓 Keep-Alive ping (${pingUrl}): status ${res.status}`);
    } catch (err) {
      logger.warn(`⚠️ Falha no Keep-Alive ping (${pingUrl}):`, err);
    }
  }, KEEP_ALIVE_INTERVAL_MS).unref();
}

async function start() {
  try {
    await connectDatabase();
    await seedSports();
    await seedExercises();
    await syncCompletedStrengthSessions();
    app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor PACELOG API rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`🔗 Health check: http://0.0.0.0:${env.PORT}/health`);
      startKeepAlive();
    });
  } catch (error) {
    logger.error('Falha fatal ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Inicializa o servidor apenas se for executado diretamente
if (process.env.NODE_ENV !== 'test') {
  start();
}
