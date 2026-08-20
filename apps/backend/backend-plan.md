# Plano de Backend — PACELOG (Node + Express + MongoDB)

> Stack: Node.js, Express, TypeScript, MongoDB (Atlas), Mongoose, Better Auth, Zod, Sentry
> Hospedagem: Railway (API) + MongoDB Atlas (banco)
> Modelo de dados: documentos com subdocumentos embutidos (sem RLS — autorização feita no código)
> Monorepo: pnpm Workspaces + Turborepo — localizado em `apps/backend/` na raiz do repositório

---

## 1. Decisões confirmadas

| Item | Decisão |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Linguagem | TypeScript |
| Banco | MongoDB Atlas (M0 free tier) [web:193][web:202] |
| ODM | Mongoose |
| Modelagem | Documentos com subdocumentos embutidos por sessão |
| Autenticação | Better Auth + adapter MongoDB oficial [web:211] |
| Validação | Zod em todos os payloads |
| Hospedagem API | Railway [web:198][web:206] |
| Segurança de dados | Filtro manual por `userId` em toda query (sem RLS) + isolamento estrito |
| Observabilidade & Privacidade | Sentry (@sentry/node) — monitoramento com sanitização ativa de PII, data scrubbing e conformidade LGPD/GDPR |

---

## 2. Risco central: autorização sem RLS

Sem Postgres/RLS, a autorização vira responsabilidade **exclusiva do código**. Isso exige uma convenção rígida:

- Nenhum controller pode chamar `Model.find()`, `findById()`, `updateOne()` ou `deleteOne()` sem incluir `userId` na condição.
- Um helper central (`scopedQuery`) deve ser a única forma "aprovada" de acessar dados de domínio do usuário.
- Testes de autorização (usuário A não pode ler/editar/excluir dado de usuário B) são obrigatórios para toda rota, não opcionais.

```ts
// src/utils/scopedQuery.ts
import { Model, FilterQuery, Types } from "mongoose";

export function scopedFilter<T>(
  userId: Types.ObjectId | string,
  filter: FilterQuery<T> = {}
): FilterQuery<T> {
  return { ...filter, userId } as FilterQuery<T>;
}

// Uso obrigatório em todo lugar:
const session = await SessionModel.findOne(
  scopedFilter(req.userId, { _id: sessionId })
);
```

Regra de revisão de código: **todo PR que toca um controller de domínio deve mostrar explicitamente o `scopedFilter` sendo usado.** Sem isso, o PR não é aceito — nem pelo agente, nem por você.

### 2.1 Privacidade e Proteção de Dados de Usuário no Sentry (LGPD / GDPR)

A observabilidade não pode ser vetor de vazamento de dados privados, biometria ou credenciais dos atletas. Regras inegociáveis de segurança no Sentry:

1. **Anti-PII Default (`sendDefaultPii: false`):** Nenhuma informação de identificação pessoal padrão (como IP bruto ou dados de rede do cliente) é coletada automaticamente.
2. **Identificação Pseudo-Anonimizada:** O `Sentry.setUser()` recebe **estritamente o `id` interno (`session.user.id`)**. E-mails, nomes completos e fotos de perfil **nunca** são enviados ao Sentry.
3. **Data Scrubbing Ativo no `beforeSend`:**
   - Mascaramento e remoção recursiva de chaves sensíveis em payloads de erro: `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, `creditCard`, `biometrics`, `notes` (notas pessoais do treino).
   - Remoção de headers sensíveis de requisição (`Cookie`, `Authorization`, `Set-Cookie`).
4. **Sanitização de Breadcrumbs no `beforeBreadcrumb`:**
   - URLs capturadas são limpas de tokens e query params sensíveis (ex: tokens de reset de senha ou e-mail).
5. **Proteção de Dados Esportivos Sensíveis:**
   - Métricas corporais e anotações pessoais do atleta não são incluídas em logs ou eventos de exceção enviados para ferramentas de terceiros.

---

## 3. Estrutura do projeto no Monorepo

O backend reside em `apps/backend/` dentro da raiz do monorepo PACELOG. A estrutura completa do repositório é:

```text
pacelog/                              ← raiz do monorepo (git root)
├── package.json                      ← scripts raiz (dev, build, test, lint via Turborepo)
├── pnpm-workspace.yaml               ← registra apps/* e packages/*
├── turbo.json                        ← pipeline de tarefas paralelas e cache
├── .env.example                      ← variáveis de ambiente raiz (documentação)
├── .gitignore
├── apps/
│   ├── backend/                      ← este plano (API Express)
│   └── frontend/                     ← plano frontend (React + Vite PWA)
└── packages/
    └── shared/                       ← (futuro) tipos TypeScript compartilhados
        └── package.json
```

Estrutura interna de `apps/backend/`:

```text
apps/backend/
├── src/
│   ├── instrument.ts        # Inicialização do Sentry (importado antes de tudo)
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   └── auth.ts
│   ├── middleware/
│   │   ├── requireAuth.ts
│   │   ├── validate.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimit.ts
│   ├── utils/
│   │   ├── scopedQuery.ts
│   │   ├── httpError.ts
│   │   └── logger.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   └── auth.routes.ts
│   │   ├── profile/
│   │   │   ├── profile.model.ts
│   │   │   ├── profile.schemas.ts
│   │   │   ├── profile.service.ts
│   │   │   ├── profile.controller.ts
│   │   │   └── profile.routes.ts
│   │   ├── sports/
│   │   │   ├── sport.model.ts
│   │   │   ├── sport.seed.ts
│   │   │   ├── sport.controller.ts
│   │   │   └── sport.routes.ts
│   │   ├── sessions/
│   │   │   ├── session.model.ts
│   │   │   ├── session.schemas.ts
│   │   │   ├── session.service.ts
│   │   │   ├── session.controller.ts
│   │   │   ├── session.routes.ts
│   │   │   └── sport-rules/
│   │   │       ├── running.rules.ts
│   │   │       ├── football.rules.ts
│   │   │       ├── futevolei.rules.ts
│   │   │       ├── boxing.rules.ts
│   │   │       └── strength.rules.ts
│   │   ├── progress/
│   │   │   ├── progress.service.ts
│   │   │   ├── progress.controller.ts
│   │   │   └── progress.routes.ts
│   │   ├── goals/
│   │   │   ├── goal.model.ts
│   │   │   ├── goal.schemas.ts
│   │   │   ├── goal.service.ts
│   │   │   ├── goal.controller.ts
│   │   │   └── goal.routes.ts
│   │   └── insights/
│   │       ├── insight.model.ts
│   │       ├── insight.service.ts
│   │       ├── insight.controller.ts
│   │       └── insight.routes.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   └── integration/
├── .env                     # variáveis locais (não commitado)
├── .env.example
├── tsconfig.json
├── package.json             # name: "@pacelog/backend"
└── Dockerfile
```

Essa organização segue o padrão recomendado para APIs Express/TypeScript: controllers tratam HTTP, services concentram regra de negócio, middleware cuida de auth/validação/erros — permitindo testar a lógica sem precisar subir o servidor HTTP [web:216][web:219].

---

## 4. Modelo de dados (Mongoose, documentos embutidos)

### 4.1 Sessão — um documento por sessão, subdocumentos por esporte

```ts
// modules/sessions/session.model.ts
import { Schema, model, Types } from "mongoose";

const roundSchema = new Schema({
  roundNumber: { type: Number, required: true, min: 1 },
  durationSeconds: { type: Number, min: 1 },
  restSeconds: { type: Number, min: 0 },
  punchesThrown: { type: Number, min: 0 },
  punchesLanded: { type: Number, min: 0 },
  rpe: { type: Number, min: 1, max: 10 },
}, { _id: false });

const futevoleiSetSchema = new Schema({
  setNumber: { type: Number, required: true, min: 1 },
  pointsFor: { type: Number, min: 0 },
  pointsAgainst: { type: Number, min: 0 },
  won: { type: Boolean },
}, { _id: false });

const strengthSetSchema = new Schema({
  setNumber: { type: Number, required: true, min: 1 },
  repetitions: { type: Number, required: true, min: 1 },
  loadKg: { type: Number, min: 0 },
}, { _id: false });

const strengthExerciseSchema = new Schema({
  name: { type: String, required: true },
  loadMode: {
    type: String,
    enum: ["total_load", "per_side_load", "bodyweight", "assisted"],
    default: "total_load",
  },
  sets: { type: [strengthSetSchema], default: [] },
}, { _id: false });

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  clientUuid: { type: String, required: true },
  sportKey: {
    type: String,
    required: true,
    enum: ["running", "football", "futevolei", "boxing", "strength"],
  },
  sessionType: { type: String },
  startedAt: { type: Date, required: true },
  durationSeconds: { type: Number, required: true, min: 1, max: 86400 },
  rpe: { type: Number, min: 1, max: 10 },
  status: {
    type: String,
    enum: ["draft", "planned", "completed", "cancelled"],
    default: "completed",
  },
  notes: { type: String, maxlength: 2000 },

  // Campos comuns em formato chave-valor para métricas simples (distância, pace, gols, etc.)
  metrics: { type: Schema.Types.Mixed, default: {} },

  // Subdocumentos específicos por esporte
  rounds: { type: [roundSchema], default: undefined },
  sets: { type: [futevoleiSetSchema], default: undefined },
  exercises: { type: [strengthExerciseSchema], default: undefined },

  deletedAt: { type: Date, default: null },
}, { timestamps: true });

sessionSchema.index({ userId: 1, clientUuid: 1 }, { unique: true });
sessionSchema.index({ userId: 1, startedAt: -1 });
sessionSchema.index({ userId: 1, sportKey: 1 });

export const SessionModel = model("Session", sessionSchema);
```

### 4.2 Perfil

```ts
const profileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  name: { type: String, required: true },
  avatarUrl: String,
  unitSystem: { type: String, enum: ["metric", "imperial"], default: "metric" },
  timezone: { type: String, default: "America/Bahia" },
  firstDayOfWeek: { type: Number, enum: [0, 1], default: 1 },
  theme: { type: String, enum: ["dark", "light", "system"], default: "dark" },
  weeklySessionGoal: { type: Number, min: 0 },
  streakEnabled: { type: Boolean, default: true },
  aiInsightsEnabled: { type: Boolean, default: true },
  activeSports: { type: [String], default: [] },
  onboardingCompletedAt: Date,
}, { timestamps: true });
```

### 4.3 Metas

```ts
const goalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  sportKey: { type: String },
  name: { type: String, required: true },
  metricKey: { type: String, required: true },
  initialValue: { type: Number, default: 0 },
  targetValue: { type: Number, required: true },
  unit: String,
  direction: {
    type: String,
    enum: ["increase", "decrease", "maintain", "complete"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "paused", "completed", "archived"],
    default: "active",
  },
  startsAt: { type: Date, default: Date.now },
  endsAt: Date,
}, { timestamps: true });
```

### 4.4 Insights

```ts
const insightSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  sportKey: String,
  type: {
    type: String,
    enum: ["evolution", "consistency", "attention", "achievement", "reflection"],
    required: true,
  },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  evidence: { type: [Schema.Types.Mixed], default: [] },
  confidence: { type: String, enum: ["low", "medium", "high"], required: true },
  period: { type: String, required: true },
  disclaimer: String,
  model: String,
  usefulFeedback: { type: Boolean, default: null },
}, { timestamps: true });
```

Better Auth cria suas próprias coleções (`user`, `session`, `account`, `verification`) via adapter — não precisamos modelá-las manualmente [web:214].

---

## 5. Autenticação com Better Auth

```ts
// config/auth.ts
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { env } from "./env";

const client = new MongoClient(env.MONGODB_URI);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // true quando o fluxo de e-mail estiver pronto
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24,     // renova a cada 1 dia de uso
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
    },
  },
  trustedOrigins: [env.APP_ORIGIN],
});
```

Better Auth já resolve expiração, renovação (`updateAge`) e cache de cookie por padrão, então não precisamos implementar rotação de refresh token manualmente [web:208][web:209]. O ponto de atenção real é o **cookie cross-domain**: como o PWA (Cloudflare Pages) e a API (Railway) ficam em domínios diferentes, `sameSite: "none"` + `secure: true` em produção são obrigatórios, senão o cookie de sessão não é enviado pelo navegador — esse foi exatamente o problema relatado por outro desenvolvedor usando essa mesma combinação [web:220].

### Middleware de autenticação

```ts
// middleware/requireAuth.ts
import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { auth } from "../config/auth";
import { HttpError } from "../utils/httpError";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers as any });

  if (!session?.user) {
    return next(new HttpError(401, "UNAUTHORIZED"));
  }

  req.userId = session.user.id;

  // Contexto de usuário no Sentry: APENAS ID interno pseudo-anonimizado (sem e-mail ou dados pessoais)
  Sentry.setUser({
    id: session.user.id,
  });

  next();
}
```

```ts
// src/types/express.d.ts
declare namespace Express {
  interface Request {
    userId?: string;
  }
}
```

---

## 6. Validação com Zod

```ts
// middleware/validate.ts
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { HttpError } from "../utils/httpError";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new HttpError(400, "VALIDATION_ERROR", result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}
```

```ts
// modules/sessions/session.schemas.ts
import { z } from "zod";

const baseSessionSchema = z.object({
  clientUuid: z.string().uuid(),
  sportKey: z.enum(["running", "football", "futevolei", "boxing", "strength"]),
  sessionType: z.string().optional(),
  startedAt: z.coerce.date(),
  durationSeconds: z.number().int().positive().max(86400),
  rpe: z.number().int().min(1).max(10).optional(),
  status: z.enum(["draft", "planned", "completed", "cancelled"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const runningSessionSchema = baseSessionSchema.extend({
  sportKey: z.literal("running"),
  metrics: z.object({
    distanceKm: z.number().positive(),
    type: z.enum(["easy", "interval", "long", "recovery", "test", "race"]).optional(),
  }),
});

export const boxingSessionSchema = baseSessionSchema.extend({
  sportKey: z.literal("boxing"),
  rounds: z.array(z.object({
    roundNumber: z.number().int().positive(),
    durationSeconds: z.number().int().positive().optional(),
    restSeconds: z.number().int().min(0).optional(),
    rpe: z.number().int().min(1).max(10).optional(),
  })).min(1),
});

export const createSessionSchema = z.discriminatedUnion("sportKey", [
  runningSessionSchema,
  boxingSessionSchema,
  // footballSessionSchema, futevoleiSessionSchema, strengthSessionSchema...
]);
```

O uso de `z.discriminatedUnion` garante, em tempo de compilação e runtime, que cada esporte só aceite os campos compatíveis — igual ao que já fizemos no frontend com os tipos discriminados de `SessionDraft`.

---

## 7. Rotas e controllers (exemplo: sessions)

```ts
// modules/sessions/session.routes.ts
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validate } from "../../middleware/validate";
import { createSessionSchema, updateSessionSchema } from "./session.schemas";
import * as controller from "./session.controller";

export const sessionRoutes = Router();

sessionRoutes.use(requireAuth);
sessionRoutes.get("/", controller.list);
sessionRoutes.get("/:id", controller.getById);
sessionRoutes.post("/", validate(createSessionSchema), controller.create);
sessionRoutes.patch("/:id", validate(updateSessionSchema), controller.update);
sessionRoutes.delete("/:id", controller.remove);
```

```ts
// modules/sessions/session.controller.ts
import type { Request, Response, NextFunction } from "express";
import * as service from "./session.service";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await service.createSession(req.userId!, req.body);
    res.status(201).json({ data: session });
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await service.listSessions(req.userId!, req.query);
    res.json({ data: sessions });
  } catch (error) {
    next(error);
  }
}
// getById, update, remove seguem o mesmo padrão, sempre passando req.userId!
```

```ts
// modules/sessions/session.service.ts
import { SessionModel } from "./session.model";
import { scopedFilter } from "../../utils/scopedQuery";
import { HttpError } from "../../utils/httpError";
import { validateSportRules } from "./sport-rules";

export async function createSession(userId: string, payload: any) {
  validateSportRules(payload); // regras específicas por esporte (ex: distância > 0 para corrida)

  return SessionModel.findOneAndUpdate(
    { userId, clientUuid: payload.clientUuid },
    { ...payload, userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function listSessions(userId: string, query: any) {
  const filter = scopedFilter(userId, { deletedAt: null });
  if (query.sport) filter.sportKey = query.sport;
  if (query.from || query.to) {
    filter.startedAt = {};
    if (query.from) filter.startedAt.$gte = new Date(query.from);
    if (query.to) filter.startedAt.$lte = new Date(query.to);
  }
  return SessionModel.find(filter).sort({ startedAt: -1 });
}

export async function getById(userId: string, id: string) {
  const session = await SessionModel.findOne(scopedFilter(userId, { _id: id }));
  if (!session) throw new HttpError(404, "SESSION_NOT_FOUND");
  return session;
}
```

O `findOneAndUpdate` com `{ userId, clientUuid }` como filtro e `upsert: true` resolve a idempotência: reenviar a mesma sessão offline (mesmo `clientUuid`) atualiza em vez de duplicar.

---

## 8. Tratamento de erros centralizado

```ts
// utils/httpError.ts
export class HttpError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) {
    super(code);
  }
}
```

```ts
// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    // Erros operacionais/4xx esperados: não poluem o Sentry com falsos alertas
    return res.status(err.status).json({ error: err.code, details: err.details ?? null });
  }

  // Erros não previstos/500: logados e reportados ao Sentry
  logger.error(err);
  Sentry.captureException(err);

  res.status(500).json({ error: "INTERNAL_ERROR" });
}
```

---

## 9. `instrument.ts`, `app.ts` e `server.ts`

```ts
// src/instrument.ts
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { env } from "./config/env";

const SENSITIVE_KEYS = [
  "password",
  "currentpassword",
  "newpassword",
  "token",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "apikey",
  "better_auth_secret",
  "gemini_api_key",
  "email",
  "notes",
];

function scrubSensitiveData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubSensitiveData);

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object") {
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
    environment: env.NODE_ENV,
    sendDefaultPii: false, // Bloqueio estrito de coleta automática de PII (IP, headers pessoais)
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Sanitização profunda antes do envio de eventos de erro
    beforeSend(event, hint) {
      if (event.request) {
        // Remove cookies e headers de autorização
        if (event.request.headers) {
          delete event.request.headers["cookie"];
          delete event.request.headers["authorization"];
        }
        // Mascara payloads de corpo de requisição
        if (event.request.data) {
          event.request.data = scrubSensitiveData(event.request.data);
        }
      }

      // Garante que o contexto de usuário não exponha e-mail ou dados pessoais
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      // Sanitiza dados extras e tags
      if (event.extra) {
        event.extra = scrubSensitiveData(event.extra);
      }

      return event;
    },

    // Sanitização de breadcrumbs (URLs com tokens, queries de autenticação)
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "http" && breadcrumb.data?.url) {
        try {
          const url = new URL(breadcrumb.data.url);
          // Remove query params que possam conter tokens ou dados pessoais
          url.searchParams.forEach((_, key) => {
            if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
              url.searchParams.set(key, "[REDACTED]");
            }
          });
          breadcrumb.data.url = url.toString();
        } catch {
          // Ignora caso não seja URL completa
        }
      }
      return breadcrumb;
    },
  });
}
```

```ts
// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth";
import { errorHandler } from "./middleware/errorHandler";
import { profileRoutes } from "./modules/profile/profile.routes";
import { sportRoutes } from "./modules/sports/sport.routes";
import { sessionRoutes } from "./modules/sessions/session.routes";
import { progressRoutes } from "./modules/progress/progress.routes";
import { goalRoutes } from "./modules/goals/goal.routes";
import { insightRoutes } from "./modules/insights/insight.routes";
import { env } from "./config/env";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.APP_ORIGIN, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Better Auth precisa do body cru antes do express.json() nas suas próprias rotas
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.use("/api/profile", profileRoutes);
app.use("/api/sports", sportRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/insights", insightRoutes);

// Observabilidade: handler de erros do Sentry antes do errorHandler da aplicação
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);
```

```ts
// src/server.ts
// instrument.ts DEVE ser o primeiro import da aplicação
import "./instrument";
import { app } from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { logger } from "./utils/logger";

async function start() {
  await connectDatabase();
  app.listen(env.PORT, () => {
    logger.info(`Servidor PACELOG rodando na porta ${env.PORT}`);
  });
}

start();
```

---

## 10. Fases de implementação

### Fase B-1 — Monorepo (pré-requisito único)

> Esta fase é executada **uma única vez, na raiz do repositório**, antes de qualquer código de backend ou frontend.

- Inicializar `git` na raiz `pacelog/`.
- Criar `pnpm-workspace.yaml` declarando `apps/*` e `packages/*`.
- Criar `package.json` raiz com scripts: `dev`, `build`, `test`, `lint`, `typecheck` (todos via Turborepo).
- Criar `turbo.json` com pipeline paralelo de builds e cache de artefatos.
- Criar `.gitignore` raiz (node_modules, dist, .env, .turbo).
- Criar estrutura vazia `apps/backend/`, `apps/frontend/`, `packages/shared/`.
- Criar `packages/shared/package.json` como `@pacelog/shared` (placeholder para tipos futuros).

**Aceite:** `pnpm install` na raiz resolve sem erros; `pnpm dev` (stub) sobe sem falha; estrutura de pastas confirmada.

### Fase B0 — Fundação do backend (`apps/backend/`)

- `package.json` com `name: "@pacelog/backend"`, `tsconfig.json`, ESLint, Prettier.
- Conexão com MongoDB Atlas via Mongoose.
- Configuração do Better Auth (email/senha, sem OAuth ainda).
- Configuração do Sentry para observabilidade e segurança (`instrument.ts`, `@sentry/node`, `@sentry/profiling-node`, regras de data scrubbing de PII e `sendDefaultPii: false`).
- `app.ts`, `server.ts`, middlewares base (`helmet`, `cors`, `rateLimit`, `errorHandler`).
- `Dockerfile` otimizado para Railway com `root directory: apps/backend`.
- `.env.example` local ao `apps/backend/`.
- Deploy inicial "hello world" no Railway apontando para `apps/backend/`.

**Aceite:** `GET /health` responde 200 em produção; login/cadastro via Better Auth funcionam via Postman/Insomnia; rota de teste de erro dispara evento capturado no painel do Sentry **sem expor senhas, tokens, cookies, e-mails ou IPs de usuários**.

### Fase B1 — Perfil e esportes

- `profile.model.ts`, rota de leitura/atualização do próprio perfil.
- Seed dos 5 esportes (`running`, `football`, `futevolei`, `boxing`, `strength`).
- Rota para ativar/desativar esportes no perfil.
- Testes de autorização: usuário A não lê/edita perfil de usuário B.

**Aceite:** fluxo de onboarding do frontend consegue persistir esportes selecionados e preferências.

### Fase B2 — Sessões (núcleo)

- `session.model.ts` com subdocumentos por esporte.
- Zod schemas com `discriminatedUnion` por `sportKey`.
- `sport-rules/*.ts` com validações específicas (RPE, distância, rounds, sets, séries).
- CRUD completo com `scopedFilter` em toda operação.
- Idempotência via `clientUuid` + `findOneAndUpdate` com upsert.
- Testes unitários das regras por esporte e testes de integração do CRUD com MongoDB em memória (`mongodb-memory-server`).

**Aceite:** os 5 formulários do frontend conseguem criar, listar, editar e excluir sessões reais; reenvio do mesmo `clientUuid` não duplica.

### Fase B3 — Progresso

- Agregações com `aggregate()` do Mongoose para: resumo semanal, comparação de período, sequência, melhores marcas.
- Sessões `cancelled`/`draft` excluídas dos cálculos.

**Aceite:** endpoint de progresso bate com os cálculos manuais feitos em teste unitário separado.

### Fase B4 — Metas

- CRUD de metas.
- Cálculo de progresso vinculado às sessões existentes.

**Aceite:** progresso de meta reflete sessões reais do usuário.

### Fase B5 — Insights e IA

- Endpoint que agrega dados determinísticos e chama Gemini.
- Validação da resposta do modelo com Zod antes de salvar.
- Regra de dados mínimos antes de gerar insight.

**Aceite:** insight só gera com dados suficientes; resposta fora do schema é rejeitada e logada, não salva.

### Fase B6 — Exportação e exclusão de conta

- Endpoint de exportação JSON completo do usuário.
- Exclusão de conta remove sessões, metas, insights e o próprio usuário (via Better Auth).

**Aceite:** exclusão não deixa documentos órfãos em nenhuma coleção.

### Fase B7 — Sincronização offline

- Endpoint de sync em lote aceitando array de sessões com `clientUuid`.
- Resposta item a item.
- Estratégia last-write-wins via `updatedAt`.

**Aceite:** lote com itens duplicados ou inválidos não derruba os itens válidos.

### Fase B8 — Qualidade e deploy contínuo

- Pipeline: lint → typecheck → testes unitários → testes de integração → build → deploy Railway.
- Logs estruturados, monitoramento de performance de queries/rotas e alertas de erro no Sentry.

**Aceite:** pipeline verde de ponta a ponta; deploy reproduzível a partir de um clone limpo do repositório; dashboard do Sentry monitorando alertas e tracing ativo.

---

## 11. Testes

| Camada | Ferramenta | O que cobre |
|---|---|---|
| Unitário | Vitest | Regras por esporte, cálculos de progresso, validação Zod |
| Integração | Vitest + `mongodb-memory-server` | Controllers + Mongoose + autorização por `userId` |
| Autorização | Vitest | Usuário A nunca acessa dado de usuário B (obrigatório em toda rota) |
| Observabilidade & Privacidade | Vitest | Erros 4xx não acionam Sentry; erros 5xx capturam stack seguro; valida que eventos enviados ao Sentry não contêm senhas, tokens, cookies, e-mails ou dados biométricos/sensíveis |
| E2E | Supertest contra API implantada | Fluxo cadastro → login → criar sessão → consultar progresso |

---

## 12. Variáveis de ambiente

```text
NODE_ENV
PORT
MONGODB_URI
APP_ORIGIN
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GEMINI_API_KEY              (fase B5)
SENTRY_DSN                  (fase B0)
SENTRY_ENVIRONMENT          (fase B0)
SENTRY_TRACES_SAMPLE_RATE   (fase B0)
```

Nenhuma dessas chaves vai para o frontend. O frontend só conhece a URL pública da API.

---

## 13. Ordem de execução com o Antigravity

```text
B-1 (Monorepo raiz) → B0 (Fundação backend) → B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8
```

Cada fase deve terminar com relatório de: arquivos criados, resultado dos testes, e o que ficou fora do escopo daquela fase. Não avançar com testes de autorização falhando — esse é o único ponto do plano que substitui o RLS do Postgres, então não é negociável.

---

## 14. Deploy no Railway (Monorepo)

O Railway detecta automaticamente monorepos com `pnpm-workspace.yaml`. Configuração do serviço de backend:

| Configuração | Valor |
|---|---|
| **Source** | Repositório GitHub do monorepo |
| **Root Directory** | `apps/backend` |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm build` |
| **Start Command** | `node dist/server.js` |
| **Health Check** | `GET /health` |

Variáveis de ambiente injetadas diretamente no painel do Railway (nunca commitadas).
