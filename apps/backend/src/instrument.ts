import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from './config/env.js';

export const SENSITIVE_KEYS = [
  'password',
  'currentpassword',
  'newpassword',
  'token',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'apikey',
  'better_auth_secret',
  'gemini_api_key',
  'email',
  'notes',
];

export function scrubSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubSensitiveData);

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      clean[key] = scrubSensitiveData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    sendDefaultPii: false, // Bloqueia coleta automática de PII (IPs, cabeçalhos de rede)
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: env.NODE_ENV === 'production' ? (env.SENTRY_TRACES_SAMPLE_RATE ?? 0.2) : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    beforeSend(event) {
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['cookie'];
          delete event.request.headers['authorization'];
        }
        if (event.request.data) {
          event.request.data = scrubSensitiveData(event.request.data);
        }
      }

      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      if (event.extra) {
        event.extra = scrubSensitiveData(event.extra);
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
        try {
          const url = new URL(breadcrumb.data.url);
          url.searchParams.forEach((_, key) => {
            if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
              url.searchParams.set(key, '[REDACTED]');
            }
          });
          breadcrumb.data.url = url.toString();
        } catch {
          // Ignora se não for URL absoluta parseável
        }
      }
      return breadcrumb;
    },
  });
}
