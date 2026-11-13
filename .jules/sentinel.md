## 2025-03-10 - [Hardcoded BETTER_AUTH_SECRET in env.ts]
**Vulnerability:** Found a hardcoded `BETTER_AUTH_SECRET` default value in `apps/backend/src/config/env.ts` (`pacelog_dev_secret_key_at_least_32_characters_long_12345`).
**Learning:** Hardcoded secrets or default secrets in environment configuration files can lead to critical security breaches if deployed with those defaults.
**Prevention:** Remove default values for sensitive secrets in environment validation schemas, requiring them to be explicitly set in the deployment environment.
