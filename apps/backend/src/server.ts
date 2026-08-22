// instrument.ts DEVE ser o primeiríssimo import da aplicação para inicializar o Sentry
import './instrument.js';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { seedSports } from './modules/sports/sport.seed.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    await connectDatabase();
    await seedSports();
    app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor PACELOG API rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`🔗 Health check: http://0.0.0.0:${env.PORT}/health`);
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
