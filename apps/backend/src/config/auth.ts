import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';
import { env } from './env.js';

const client = new MongoClient(env.MONGODB_URI);
const db = client.db();

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db, { client }),
  baseURL: env.BETTER_AUTH_URL || 'http://localhost:3333',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // 1 dia
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === 'production' || env.NODE_ENV === 'staging',
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === 'production' || env.NODE_ENV === 'staging' ? 'none' : 'lax',
      secure: env.NODE_ENV === 'production' || env.NODE_ENV === 'staging',
      httpOnly: true,
    },
  },
  trustedOrigins: [
    env.APP_ORIGIN,
    'https://pacelog-staging.pages.dev',
    'https://*.pages.dev',
    'https://*.railway.app',
    'https://*.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://192.168.*',
  ],
});
