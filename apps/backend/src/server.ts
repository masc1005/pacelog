// instrument.ts DEVE ser o primeiríssimo import da aplicação para inicializar o Sentry
import './instrument.js';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    await connectDatabase();
    app.listen(env.PORT, () => {
      logger.info(`🚀 Servidor PACELOG API rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
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
