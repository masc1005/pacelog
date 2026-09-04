import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/pacelog'),
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, 'BETTER_AUTH_SECRET deve ter no mínimo 16 caracteres')
    .default('pacelog_dev_secret_key_at_least_32_characters_long_12345'),
  BETTER_AUTH_URL: z.string().default('http://localhost:3333'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Erro de validação das variáveis de ambiente:');
  console.error(_env.error.format());
  throw new Error('Configuração de ambiente inválida');
}

export const env = _env.data;
