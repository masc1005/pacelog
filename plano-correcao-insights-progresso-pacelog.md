# Plano de correção — Insights e progresso multiesportivo do PACELOG

## Objetivo

Corrigir o comportamento atual em que o sistema interpreta os dados principalmente como monitoramento de risco/carga e exibe mensagens como:

```text
Seu ACWR em 4 indica claramente uma zona de perigo.
Sua prioridade imediata é a recuperação.
```

O PACELOG deve passar a responder principalmente:

- Em qual esporte houve maior evolução?
- Qual modalidade apresentou mais consistência?
- Onde houve melhora de desempenho com esforço semelhante?
- Qual métrica evoluiu em relação ao baseline individual?
- Quais modalidades ainda têm dados insuficientes?

A carga percebida continuará existindo, mas será apenas contexto. O foco principal será **progresso comparável por esporte**.

---

# Diagnóstico

## Problema atual

O prompt atual começa com carga percebida:

```text
DADOS DE CARGA PERCEBIDA:
- Carga atual
- Baseline
- Variação
- Status
- Confiança
```

E o contexto atual inclui linguagem de risco derivada de ACWR. Isso força o modelo a produzir uma análise sobre carga, recuperação e lesão, mesmo quando o objetivo do produto é comparar evolução.

## Causa raiz

A feature atual mistura quatro conceitos:

```text
Carga percebida
Volume externo
Desempenho
Progresso
```

Além disso:

- não há um objeto estruturado de progresso por esporte no contexto da IA;
- a carga aparece antes das métricas de desempenho;
- o prompt não recebe baseline específico da modalidade;
- a IA recebe texto de risco pré-calculado;
- a resposta é texto livre, sem contrato estruturado;
- o dashboard prioriza carga semanal em vez de evolução entre esportes.

## Regra de produto

```text
Carga não é performance.
Carga maior não significa automaticamente progresso.
Progresso deve ser comparado ao baseline da própria modalidade.
```

---

# Escopo desta correção

## Incluído

- Corrigir o contexto enviado à IA.
- Remover linguagem de risco da análise principal.
- Criar progresso estruturado por esporte.
- Criar baseline específico por métrica.
- Criar comparação relativa respeitando direção da métrica.
- Atualizar endpoint de progresso.
- Atualizar prompt da IA.
- Validar resposta da IA com Zod.
- Atualizar dashboard.
- Atualizar `ProgressPage`.
- Atualizar `EvolutionBySportPage`.
- Adicionar testes.
- Manter compatibilidade com `sessionalLoad` e usar `load.srpe` como campo oficial quando aplicável.

## Fora de escopo

- Implementar TRIMP.
- Implementar monotonia.
- Implementar strain.
- Implementar ACWR como indicador de risco.
- Criar recomendações médicas.
- Criar plano automático de treino.
- Criar ranking entre usuários.
- Alterar o design system principal.
- Migrar imediatamente todo o backend para Clean Architecture.

---

# Resultado esperado

## Antes

```text
Seu ACWR em 4 indica claramente uma zona de perigo,
sinalizando um pico agudo de esforço e alto risco de sobrecarga ou lesão.
```

## Depois

```text
Seu maior avanço apareceu no boxe.

Você passou de uma média de 4 para 6 rounds por sessão,
com melhora na avaliação de condicionamento de 3,0 para 3,8/5.

Na corrida, seu pace também melhorou 5,5% com esforço percebido semelhante.
O futevôlei mostra sinais iniciais de evolução, mas ainda tem poucos dados.
```

---

# Fase 1 — Contratos compartilhados

## Objetivo

Criar tipos claros para separar carga, desempenho e progresso.

## Arquivos

```text
packages/shared/src/metrics/
├── load.types.ts
├── performance.types.ts
├── progress.types.ts
├── confidence.types.ts
└── metric-definitions.ts
```

## Tipos

```ts
export type MetricDirection =
  | "higher_is_better"
  | "lower_is_better"
  | "neutral";

export type ConfidenceLevel = "low" | "medium" | "high";

export type ProgressStatus =
  | "improved"
  | "stable"
  | "declined"
  | "insufficient_data";

export type ProgressMetric = {
  key: string;
  label: string;
  currentValue: number;
  baselineValue: number;
  relativeChangePercent: number;
  unit: string;
  direction: MetricDirection;
  status: ProgressStatus;
};

export type SportProgress = {
  sportKey: SportKey;
  sportLabel: string;
  sessions: {
    current: number;
    baseline: number;
    variationPercent: number;
  };
  primaryMetric: ProgressMetric;
  secondaryMetrics: ProgressMetric[];
  loadContext: {
    currentSrpe: number | null;
    baselineSrpe: number | null;
    variationPercent: number | null;
  };
  evidence: string[];
  confidence: ConfidenceLevel;
};

export type ProgressComparison = {
  period: PeriodDescriptor;
  overall: {
    currentSessions: number;
    baselineSessions: number;
    consistencyPercent: number;
    baselineConsistencyPercent: number;
  };
  sports: SportProgress[];
  ranking: {
    mostImproved: SportKey | null;
    mostConsistent: SportKey | null;
    mostEfficient: SportKey | null;
  };
  loadContext: {
    currentSrpe: number | null;
    baselineSrpe: number | null;
    variationPercent: number | null;
    distributionBySport: Array<{
      sportKey: SportKey;
      srpe: number;
      sharePercent: number;
    }>;
  };
  confidence: ConfidenceLevel;
};
```

## Critérios de aceite

- Nenhum progresso é representado sem unidade.
- Toda métrica possui direção.
- Toda métrica informa status.
- `loadContext` é separado de `primaryMetric`.
- Os tipos são compartilhados entre frontend e backend.

---

# Fase 2 — Métricas principais por esporte

## Objetivo

Definir uma métrica de progresso principal por modalidade.

## Configuração

```ts
export const PRIMARY_SPORT_METRICS = {
  running: {
    key: "paceSecondsPerKm",
    label: "Pace médio",
    unit: "min/km",
    direction: "lower_is_better",
  },
  football: {
    key: "minutesPlayed",
    label: "Minutos jogados",
    unit: "min",
    direction: "higher_is_better",
  },
  futevolei: {
    key: "technicalAverage",
    label: "Média técnica",
    unit: "/5",
    direction: "higher_is_better",
  },
  boxing: {
    key: "roundCompletionRate",
    label: "Conclusão de rounds",
    unit: "%",
    direction: "higher_is_better",
  },
  strength: {
    key: "totalVolumeKg",
    label: "Volume total",
    unit: "kg",
    direction: "higher_is_better",
  },
} as const;
```

## Métricas secundárias

### Corrida

- distância;
- tempo total;
- sRPE por km;
- melhor marca;
- elevação, se disponível.

### Futebol

- gols;
- assistências;
- minutos;
- resultado;
- distância, se disponível.

### Futevôlei

- sets vencidos;
- taxa de sets vencidos;
- saque;
- recepção;
- levantamento;
- ataque;
- defesa.

### Boxe

- rounds;
- tempo ativo;
- work/rest;
- condicionamento;
- footwork;
- defesa;
- precisão, se disponível.

### Musculação

- séries;
- repetições;
- volume;
- carga por exercício;
- e1RM opcional.

## Regra importante

Aumento de volume de musculação não deve ser descrito automaticamente como melhora de performance. O sistema deve usar linguagem como:

```text
Você realizou mais volume.
```

E só falar em evolução se houver progressão comparável por exercício ou faixa de repetições.

---

# Fase 3 — Serviço de comparação por esporte

## Objetivo

Criar uma camada determinística para calcular progresso antes de chamar a IA.

## Arquivos backend

```text
apps/backend/src/modules/progress/
├── progress.service.ts
├── comparison/
│   ├── compare-metric.ts
│   ├── calculate-baseline.ts
│   ├── calculate-confidence.ts
│   ├── compare-running.ts
│   ├── compare-football.ts
│   ├── compare-futevolei.ts
│   ├── compare-boxing.ts
│   └── compare-strength.ts
└── types/
    └── progress.types.ts
```

## Comparação

Para `higher_is_better`:

```ts
relativeChange = ((current - baseline) / Math.abs(baseline)) * 100;
```

Para `lower_is_better`:

```ts
relativeImprovement = ((baseline - current) / Math.abs(baseline)) * 100;
```

Para `neutral`:

```text
mostrar mudança, mas não classificar como melhora ou piora.
```

## Baseline

Usar:

- últimas 4 semanas completas;
- ou últimas 3 sessões comparáveis quando não houver 4 semanas;
- marcar confiança baixa quando houver pouco histórico.

## Confiança

```text
low:
menos de 3 sessões comparáveis.

medium:
3 a 7 sessões e pelo menos 14 dias.

high:
8 ou mais sessões e pelo menos 28 dias.
```

## Evidências

Cada esporte deve produzir frases determinísticas:

```text
"Você passou de 4 para 6 rounds por sessão."
"Seu pace médio caiu de 6:05/km para 5:45/km."
"Sua média técnica subiu de 3,2/5 para 3,8/5."
"Seu volume aumentou de 7.200 kg para 8.400 kg."
```

## Critérios de aceite

- O cálculo não depende de IA.
- Cada esporte usa somente sessões comparáveis.
- Direção da métrica é respeitada.
- Dados insuficientes retornam `insufficient_data`.
- Evidências são reproduzíveis por testes.

---

# Fase 4 — Alteração do modelo de sessão

## Objetivo

Manter compatibilidade com dados atuais e estruturar a carga.

## Compatibilidade

Manter:

```text
sessionalLoad
```

como campo legado.

Adicionar:

```ts
load?: {
  srpe: number;
  rpe: number;
  durationMinutes: number;
  calculationVersion: number;
};
```

## Regra de autoridade

```text
load.srpe é o campo oficial.
sessionalLoad é legado.
Ambos devem receber o mesmo valor calculado por uma função única.
```

## Implementação

```ts
function buildSessionLoad(
  rpe: number | undefined,
  durationSeconds: number
) {
  if (rpe === undefined) {
    return {
      sessionalLoad: null,
      load: null,
    };
  }

  const srpe = Math.round(rpe * (durationSeconds / 60));

  return {
    sessionalLoad: srpe,
    load: {
      srpe,
      rpe,
      durationMinutes: Math.round((durationSeconds / 60) * 100) / 100,
      calculationVersion: 1,
    },
  };
}
```

## ACWR e termos antigos

Remover da interface:

```text
danger_zone
Risco aumentado de sobrecarga/lesão
Zona de perigo
```

Se a API antiga precisar continuar funcionando, manter aliases somente no payload, sem exibição no frontend.

Novos status:

```text
baseline
improved
stable
below_baseline
insufficient_data
```

---

# Fase 5 — API de progresso comparativo

## Endpoints

```text
GET /api/progress/summary
GET /api/progress/comparison
GET /api/progress/by-sport
GET /api/progress/load
```

## `GET /api/progress/comparison`

Retornar:

```json
{
  "period": {
    "key": "last_30_days",
    "start": "2026-07-23T00:00:00.000Z",
    "end": "2026-08-22T23:59:59.999Z"
  },
  "overall": {
    "currentSessions": 14,
    "baselineSessions": 11,
    "consistencyPercent": 78,
    "baselineConsistencyPercent": 61
  },
  "sports": [],
  "ranking": {
    "mostImproved": "boxing",
    "mostConsistent": "running",
    "mostEfficient": "running"
  },
  "loadContext": {
    "currentSrpe": 1840,
    "baselineSrpe": 1420,
    "variationPercent": 29.6,
    "distributionBySport": []
  },
  "confidence": "medium"
}
```

## Regras

- Não retornar “risco” como interpretação.
- Não chamar carga de performance.
- Não calcular ranking com valores absolutos incompatíveis.
- `mostImproved` usa progresso relativo por esporte.
- `mostConsistent` usa frequência/aderência.
- `mostEfficient` exige comparação entre desempenho e carga semelhante.

---

# Fase 6 — Novo contexto para a IA

## Objetivo

Trocar o prompt orientado a alerta de carga por um prompt orientado a progresso.

## Remover do contexto

```text
ACWR
statusMessage baseado em danger_zone
risco de lesão
recomendação de recuperação como conclusão
```

## Adicionar ao contexto

```text
- progresso por esporte;
- métrica principal;
- valor atual;
- baseline;
- variação relativa;
- direção da métrica;
- evidências;
- confiança;
- ranking de evolução;
- carga apenas como contexto.
```

## Novo prompt

```ts
const prompt = `
Você é o analista de progresso esportivo do PACELOG.

Seu objetivo é interpretar a evolução do atleta em diferentes esportes.

Foque em:
- maior progresso relativo;
- consistência;
- desempenho comparável;
- evolução com esforço semelhante;
- limitações dos dados.

Não faça diagnósticos.
Não calcule risco de lesão.
Não use ACWR.
Não use “zona de perigo”.
Não use “overtraining”.
Não recomende tratamento ou descanso obrigatório.
Não trate maior carga como melhor performance.

Período:
${context.period.label}

Resumo:
- Sessões atuais: ${context.overview.currentSessions}
- Sessões no baseline: ${context.overview.baselineSessions}
- Consistência atual: ${context.overview.consistencyPercent}%
- Consistência no baseline: ${context.overview.baselineConsistencyPercent}%

Progresso por esporte:
${context.sports.map(sport => `
${sport.sportLabel.toUpperCase()}
- Métrica: ${sport.primaryMetric.label}
- Atual: ${sport.primaryMetric.currentValue} ${sport.primaryMetric.unit}
- Baseline: ${sport.primaryMetric.baselineValue} ${sport.primaryMetric.unit}
- Variação relativa: ${sport.primaryMetric.relativeChangePercent}%
- Direção: ${sport.primaryMetric.direction}
- Status: ${sport.primaryMetric.status}
- Sessões: ${sport.sessions.current} atuais vs ${sport.sessions.baseline} anteriores
- Carga contextual: ${sport.loadContext.currentSrpe ?? "não disponível"} AU
- Evidências:
${sport.evidence.map(item => `  - ${item}`).join("\\n")}
- Confiança: ${sport.confidence}
`).join("\\n")}

Comparação:
- Maior progresso: ${context.ranking.mostImproved ?? "não identificado"}
- Maior consistência: ${context.ranking.mostConsistent ?? "não identificado"}
- Maior eficiência: ${context.ranking.mostEfficient ?? "não identificado"}

Carga contextual:
- Carga atual: ${context.loadContext.currentSrpe ?? "não disponível"} AU
- Baseline: ${context.loadContext.baselineSrpe ?? "não disponível"} AU
- Variação: ${context.loadContext.variationPercent ?? "não disponível"}%

A carga é apenas contexto. Ela não representa automaticamente performance,
risco, lesão ou necessidade de descanso.

Retorne somente JSON válido:
{
  "headline": "frase curta sobre a evolução principal",
  "summary": "até 3 frases",
  "topProgress": [],
  "consistencyInsight": "observação sobre consistência",
  "loadContext": "frase neutra sobre a carga",
  "dataLimitations": [],
  "confidence": "low | medium | high"
}
`;
```

## Validação da resposta

Criar schema Zod:

```ts
const aiProgressInsightSchema = z.object({
  headline: z.string().max(160),
  summary: z.string().max(700),
  topProgress: z.array(z.object({
    sport: z.string(),
    metric: z.string(),
    current: z.string(),
    baseline: z.string(),
    variation: z.string(),
    interpretation: z.string().max(400),
  })).max(3),
  consistencyInsight: z.string().max(400),
  loadContext: z.string().max(400),
  dataLimitations: z.array(z.string()).max(5),
  confidence: z.enum(["low", "medium", "high"]),
});
```

---

# Fase 7 — Redesign do dashboard

## Arquivo principal

```text
apps/frontend/src/pages/home/HomePage.tsx
```

## Nova hierarquia

### Bloco principal

```text
PROGRESSO DA SEMANA

3 esportes com evolução

Corrida     +5,5%
Boxe       +50%
Futevôlei  +11,8%
```

### Bloco de carga secundário

```text
CARGA PERCEBIDA
1.840 AU
+29% vs baseline de 4 semanas
```

### Card de IA

Título:

```text
Análise da sua evolução
```

Texto esperado:

```text
Seu maior avanço apareceu no boxe: você sustentou mais rounds
com melhora no condicionamento.
```

Rodapé:

```text
Baseado em 14 sessões · confiança média
```

## Abas

```text
Visão geral
Carga
Progresso
```

### Visão geral

- esportes ativos;
- sessões;
- consistência;
- maior progresso;
- últimas sessões.

### Carga

- sRPE;
- tempo;
- distribuição por esporte;
- comparação com baseline.

### Progresso

- progresso relativo;
- métrica principal por esporte;
- evidências;
- confiança.

## Estados

- sem dados;
- uma ou duas sessões;
- baseline provisório;
- erro;
- carregando;
- offline.

---

# Fase 8 — Atualização das telas de evolução

## `ProgressPage.tsx`

Adicionar seções:

```text
Visão geral
Carga
Progresso por esporte
Consistência
Marcas
```

A tela deve sempre indicar se o usuário está vendo:

```text
carga;
desempenho;
consistência;
```

## `EvolutionBySportPage.tsx`

Adicionar:

- seletor de esporte;
- seletor de métrica;
- atual;
- baseline;
- variação;
- direção da métrica;
- gráfico de histórico;
- evidências;
- confiança;
- estado de dados insuficientes.

Exemplo para corrida:

```text
Pace médio
Atual: 5:45/km
Baseline: 6:05/km
Variação: 5,5% de melhora
```

Exemplo para musculação:

```text
Volume total
Atual: 8.400 kg
Baseline: 7.200 kg
Variação: +16,7% de volume
Observação: volume maior não prova sozinho melhora de força.
```

---

# Fase 9 — Testes

## Backend

Criar ou atualizar:

```text
calculateSrpe.test.ts
progressComparison.test.ts
sportProgress.test.ts
baseline.test.ts
confidence.test.ts
legacyLoadCompatibility.test.ts
progressSummary.integration.test.ts
insightContext.test.ts
```

## Frontend

Criar ou atualizar:

```text
LoadSummaryCard.test.tsx
SportProgressCard.test.tsx
ProgressOverview.test.tsx
EvolutionBySportPage.test.tsx
AiProgressInsight.test.tsx
```

## Casos obrigatórios

- `sessionalLoad` e `load.srpe` possuem o mesmo valor.
- A fonte oficial é `load.srpe`.
- ACWR não aparece no novo contexto de IA.
- “danger_zone” não aparece na interface.
- Pace menor é interpretado como melhora.
- Volume maior não é automaticamente chamado de evolução.
- Boxe compara rounds com rounds.
- Futevôlei compara fundamentos com fundamentos.
- Musculação compara volume/carga dentro do próprio esporte.
- Dados insuficientes retornam status apropriado.
- Usuário com maior carga não é automaticamente classificado como mais evoluído.
- A IA recebe evidências determinísticas.
- A resposta da IA segue o schema JSON.

---

# Ordem de implementação

```text
1. Contratos compartilhados
2. Serviço de comparação por esporte
3. Persistência de load.srpe
4. Baselines e confiança
5. API de comparação
6. Novo contexto da IA
7. Dashboard
8. Tela de progresso
9. Evolução por esporte
10. Testes e regressão
```

Não começar pelo dashboard. O dashboard deve consumir dados corretos da API; caso contrário, a interface apenas mascarará o problema de domínio.

---

# Critérios finais de aceite

A correção estará concluída quando:

- o sistema não falar mais em “zona de perigo” no fluxo principal;
- ACWR não for enviado ao prompt da IA;
- carga percebida for apresentada como contexto;
- cada esporte tiver uma métrica principal de progresso;
- cada métrica tiver baseline individual;
- comparações respeitarem a direção da métrica;
- o dashboard destacar evolução entre modalidades;
- a tela de carga continuar disponível separadamente;
- o usuário conseguir ver qual esporte mais evoluiu e por quê;
- as evidências forem numéricas e reproduzíveis;
- a IA não calcular métricas;
- a IA não fazer diagnóstico;
- dados insuficientes forem explicitamente informados;
- `sessionalLoad` continuar compatível;
- `load.srpe` for a fonte oficial futura;
- testes críticos passarem.
