import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEV_DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/pacelog';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().default(3333),
    MONGODB_URI: z.string().default(DEV_DEFAULT_MONGO_URI),
    APP_ORIGIN: z.string().default('http://localhost:5173'),
    BETTER_AUTH_SECRET: z
      .string()
      .min(16, 'BETTER_AUTH_SECRET deve ter no mínimo 16 caracteres'),
    BETTER_AUTH_URL: z.string().default('http://localhost:3333'),
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isProdOrStaging = data.NODE_ENV === 'production' || data.NODE_ENV === 'staging';
    if (!isProdOrStaging) return;

    if (!process.env.MONGODB_URI || data.MONGODB_URI === DEV_DEFAULT_MONGO_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGODB_URI'],
        message: 'MONGODB_URI deve ser configurado explicitamente em staging/production',
      });
    }
  });

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Erro de validação das variáveis de ambiente:');
  console.error(_env.error.format());
  throw new Error('Configuração de ambiente inválida');
}

export const env = _env.data;
