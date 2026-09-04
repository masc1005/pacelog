import { InsightModel, type IInsight } from './insight.model.js';
import { progressService } from '../progress/progress.service.js';
import { env } from '../../config/env.js';
import { GoogleGenAI } from '@google/genai';
import type { AIInsightDTO } from '@pacelog/shared';
import { SessionModel } from '../sessions/session.model.js';
import { LOAD_DISCLAIMER } from '../progress/baseline.service.js';
import { z } from 'zod';

const aiProgressInsightSchema = z.object({
  headline: z.string().describe('string, máximo 60 caracteres, foco na maior evolução do período'),
  summary: z.string().describe('string, 2 a 4 frases, explica a evolução central usando valores concretos'),
  topProgress: z.array(
    z.object({
      sportKey: z.string().describe('string, chave exata do esporte nos dados fornecidos'),
      metric: z.string().describe('string, nome da métrica que evoluiu'),
      previousValue: z.string().optional().nullable(),
      currentValue: z.string().optional().nullable(),
      variation: z.string().optional().nullable(),
      loadNote: z.string().optional().nullable(),
      description: z.string().describe('string, 1 a 2 frases explicando a evolução com os valores acima'),
    })
  ).describe('Lista dos destaques de evolução no período.'),
  hasEvolution: z.boolean().optional().default(true),
});

// ==========================================
// REGRAS DE PROMPT PARA IA
// ==========================================

/**
 * Regras invariáveis que o prompt da IA deve seguir:
 * - Não chamar carga alta de risco.
 * - Não fazer diagnóstico.
 * - Não recomendar tratamento.
 * - Diferenciar carga, volume e desempenho.
 * - Informar período e baseline.
 * - Usar somente os dados recebidos.
 * - Não inventar causalidade.
 * - Declarar insuficiência de dados.
 * - Produzir texto curto e objetivo.
 * - IA não calcula números — apenas interpreta dados já calculados.
 */
const AI_SYSTEM_RULES_V2 = `
REGRAS OBRIGATÓRIAS:
- Nunca use termos como "risco de lesão", "zona de perigo", "overtraining" ou qualquer linguagem médica.
- Nunca faça diagnóstico ou recomende tratamento.
- Foco em PROGRESSO: consistência (frequência) e melhoria relativa em métricas.
- Carga (sRPE-TL) é usada como CONTEXTO: maior carga não significa evolução. Evolução é melhorar métricas mantendo ou diminuindo carga.
- Use somente os dados fornecidos. Não invente valores ou causalidades.
- Retorne estritamente um objeto JSON estruturado. Não adicione markdown ou textos antes/depois do JSON.
`;

// ==========================================
// INSIGHT SERVICE
// ==========================================

export class InsightService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  /**
   * Gera um insight diário contextualizado com dados determinísticos.
   * A IA interpreta — não calcula — os dados do progresso.
   */
  async getDailyInsight(userId: string): Promise<AIInsightDTO> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingInsight = await InsightModel.findOne({
      userId,
      createdAt: { $gte: today },
      type: 'daily_progress',
    }).sort({ createdAt: -1 });

    if (existingInsight) {
      return this.mapToDTO(existingInsight);
    }

    const insightContent = await this.generateDailyInsightFromGemini(userId);

    const newInsight = await InsightModel.create({
      userId,
      content: insightContent,
      type: 'daily_progress',
    });

    return this.mapToDTO(newInsight);
  }

  async getExistingSessionInsight(userId: string, sessionId: string): Promise<AIInsightDTO | null> {
    const existingInsight = await InsightModel.findOne({
      userId,
      sessionId,
      type: 'session_analysis',
    });
    if (!existingInsight) return null;
    return this.mapToDTO(existingInsight);
  }

  /**
   * Gera ou recupera um insight comparativo de sessão.
   * Envia dados estruturados e contextualizados à IA — sem cálculos pela IA.
   */
  async getSessionComparisonInsight(userId: string, sessionId: string): Promise<AIInsightDTO> {
    const existingInsight = await InsightModel.findOne({
      userId,
      sessionId,
      type: 'session_analysis',
    });

    if (existingInsight) {
      return this.mapToDTO(existingInsight);
    }

    const currentSession = await SessionModel.findOne({ _id: sessionId, userId });
    if (!currentSession) {
      throw new Error('Sessão não encontrada');
    }

    const previousSession = await SessionModel.findOne({
      userId,
      sportKey: currentSession.sportKey,
      startedAt: { $lt: currentSession.startedAt },
    }).sort({ startedAt: -1 });

    const insightContent = await this.generateSessionInsightFromGemini(currentSession, previousSession);

    const newInsight = await InsightModel.create({
      userId,
      sessionId,
      content: insightContent,
      type: 'session_analysis',
    });

    return this.mapToDTO(newInsight);
  }

  // ==========================================
  // INSIGHTS DE FORÇA
  // ==========================================

  /**
   * Retorna insight de sessão de força já gerado, sem chamar a IA.
   * Retorna null se ainda não foi gerado.
   */
  async getStrengthSessionInsight(userId: string, sessionId: string): Promise<AIInsightDTO | null> {
    const existing = await InsightModel.findOne({
      userId,
      sessionId,
      type: 'strength_session_analysis',
    });
    if (!existing) return null;
    return this.mapToDTO(existing);
  }

  /**
   * Gera (ou regenera com force=true) o insight de uma sessão de força finalizada.
   * Busca a sessão no ActiveStrengthSessionModel e compara com a anterior.
   */
  async generateStrengthSessionInsight(
    userId: string,
    sessionId: string,
    force = false
  ): Promise<AIInsightDTO> {
    if (force) {
      await InsightModel.deleteOne({ userId, sessionId, type: 'strength_session_analysis' });
    }

    const existing = await InsightModel.findOne({
      userId,
      sessionId,
      type: 'strength_session_analysis',
    });
    if (existing) return this.mapToDTO(existing);

    // Import lazy para evitar dependência circular
    const { ActiveStrengthSessionModel } = await import('../strength/strength-session.model.js');

    const current = await ActiveStrengthSessionModel.findOne({ _id: sessionId, userId });
    if (!current) throw new Error('Sessão de força não encontrada');
    if (current.status !== 'completed') throw new Error('A sessão ainda não foi finalizada');

    const previous = await ActiveStrengthSessionModel.findOne({
      userId,
      status: 'completed',
      startedAt: { $lt: current.startedAt },
    }).sort({ startedAt: -1 });

    const content = await this.generateStrengthInsightFromGemini(current, previous);

    const newInsight = await InsightModel.create({
      userId,
      sessionId,
      content,
      type: 'strength_session_analysis',
    });

    return this.mapToDTO(newInsight);
  }

  /**
   * Gera o texto do insight via Gemini com dados estruturados de força.
   * A IA interpreta — não calcula — volume, séries e 1RM já computados pelo backend.
   */
  private async generateStrengthInsightFromGemini(current: any, previous: any | null): Promise<string> {
    try {
      const formatSession = (session: any) => {
        const durationMin = session.durationSeconds ? Math.round(session.durationSeconds / 60) : null;
        const exercises = (session.exercises ?? []).map((ex: any) => {
          const completed = ex.sets.filter((s: any) => s.status === 'completed');
          const volume = completed.reduce((acc: number, s: any) => {
            if (s.load != null && s.reps != null && s.loadUnit === 'kg') {
              return acc + s.load * s.reps;
            }
            return acc;
          }, 0);
          return {
            name: ex.exerciseNameSnapshot,
            completedSets: completed.length,
            totalSets: ex.sets.length,
            volumeKg: volume > 0 ? volume : null,
          };
        });
        return {
          date: new Date(session.startedAt).toLocaleDateString('pt-BR'),
          durationMinutes: durationMin,
          totalVolumeKg: session.totalVolumeKg ?? null,
          completedSets: session.completedSets ?? null,
          totalSets: session.totalSets ?? null,
          estimatedOneRepMax: session.estimatedOneRepMax ?? null,
          exercises,
          notes: session.notes ?? null,
        };
      };

      const currentData = formatSession(current);
      const previousData = previous ? formatSession(previous) : null;

      const strengthRules = AI_SYSTEM_RULES_V2.replace(
        '- Retorne estritamente um objeto JSON estruturado. Não adicione markdown ou textos antes/depois do JSON.',
        '- Retorne a interpretação em texto simples e direto, em até 3 frases curtas, sem markdown ou JSON.'
      );

      const prompt = `Você é um assistente de treino de musculação do aplicativo Pacelog.
${strengthRules}

Você recebeu dados de uma sessão de treino de força. Interprete a evolução ou o desempenho com base nos dados.

SESSÃO ATUAL (${currentData.date}):
- Duração: ${currentData.durationMinutes != null ? `${currentData.durationMinutes} min` : 'não informada'}
- Volume total: ${currentData.totalVolumeKg != null ? `${currentData.totalVolumeKg.toFixed(1)} kg` : 'não calculado'}
- Séries: ${currentData.completedSets ?? '?'}/${currentData.totalSets ?? '?'} completas
- 1RM estimado: ${currentData.estimatedOneRepMax != null ? `${currentData.estimatedOneRepMax.toFixed(1)} kg` : 'não calculado'}
- Exercícios: ${JSON.stringify(currentData.exercises)}
${currentData.notes ? `- Notas do atleta: "${currentData.notes}"` : ''}

${previousData
  ? `SESSÃO ANTERIOR (${previousData.date}):
- Duração: ${previousData.durationMinutes != null ? `${previousData.durationMinutes} min` : 'não informada'}
- Volume total: ${previousData.totalVolumeKg != null ? `${previousData.totalVolumeKg.toFixed(1)} kg` : 'não calculado'}
- Séries: ${previousData.completedSets ?? '?'}/${previousData.totalSets ?? '?'} completas
- 1RM estimado: ${previousData.estimatedOneRepMax != null ? `${previousData.estimatedOneRepMax.toFixed(1)} kg` : 'não calculado'}
- Exercícios: ${JSON.stringify(previousData.exercises)}
${previousData.notes ? `- Notas do atleta: "${previousData.notes}"` : ''}

Compare as sessões. Destaque evolução de volume, séries completas ou 1RM. Leve as notas em consideração se houver.`
  : `Esta é a primeira sessão de musculação registrada. Descreva o que os dados mostram sem comparar com histórico inexistente.`}

Interpretação:`;

      if (!this.ai) {
        return previousData
          ? `Volume: de ${previousData.totalVolumeKg?.toFixed(0) ?? '?'} kg para ${currentData.totalVolumeKg?.toFixed(0) ?? '?'} kg. Continue registrando para construir seu histórico.`
          : `Primeira sessão de musculação registrada. Volume total: ${currentData.totalVolumeKg?.toFixed(0) ?? 'não calculado'} kg. Continue registrando!`;
      }

      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
      });

      return response.text || 'Sessão de musculação registrada. Acompanhe sua evolução de volume e séries.';
    } catch (error) {
      console.error('[InsightService] Gemini Strength Generation Failed:', error);
      return 'Sessão registrada com sucesso. Continue treinando para construir seu histórico de força.';
    }
  }

  /**
   * Gera insight de sessão enviando dados estruturados — sem linguagem médica no prompt.
   */
  private async generateSessionInsightFromGemini(current: any, previous: any | null): Promise<string> {
    try {
      const sportName = current.sportKey;
      const currentLoad = (current as any).load?.srpe ?? current.sessionalLoad;
      const previousLoad = previous ? ((previous as any).load?.srpe ?? previous.sessionalLoad) : null;

      // Payload estruturado — IA interpreta, não calcula
      const currentData = {
        sportKey: sportName,
        durationMinutes: Math.round(current.durationSeconds / 60),
        rpe: current.rpe,
        srpeLoad: currentLoad,
        metrics: current.metrics,
        notes: current.notes,
        period: new Date(current.startedAt).toLocaleDateString('pt-BR'),
      };

      const previousData = previous ? {
        durationMinutes: Math.round(previous.durationSeconds / 60),
        rpe: previous.rpe,
        srpeLoad: previousLoad,
        metrics: previous.metrics,
        notes: previous.notes,
        period: new Date(previous.startedAt).toLocaleDateString('pt-BR'),
      } : null;

      const sessionRules = AI_SYSTEM_RULES_V2.replace(
        '- Retorne estritamente um objeto JSON estruturado. Não adicione markdown ou textos antes/depois do JSON.',
        '- Retorne a interpretação em texto simples e direto, em um único parágrafo, sem formatação markdown ou JSON.'
      );

      const sportTipsInstruction = ['boxing', 'futevolei'].includes(sportName)
        ? `\n\nATENÇÃO ESPECIAL TÉCNICA: Como esta é uma sessão de ${sportName}, se as notas táticas contiverem alguma queixa ou dificuldade técnica (ex: "chapada ruim", "guarda baixa", etc), inclua de forma amigável no final da sua resposta 1 ou 2 dicas práticas e curtas sobre como melhorar ou ajustar o fundamento mencionado.`
        : '';

      const cyclingInstruction = sportName === 'cycling'
        ? `\n\nATENÇÃO ESPECIAL CICLISMO: No ciclismo, velocidade média maior é uma melhora (higher_is_better). Diferencie pedais de rua (road), indoor/spinning (indoor) e mountain bike (mountain_bike). Não confunda velocidade média (km/h) com pace (min/km).`
        : '';

      const jiujitsuInstruction = sportName === 'jiujitsu'
        ? `\n\nATENÇÃO ESPECIAL JIU-JITSU: Trate frequência e volume de rolas/treino como sinais de evolução. Nunca interprete submissões sofridas como fraqueza ou retrocesso — são parte essencial do aprendizado. Não compare gi com no-gi diretamente. NUNCA diga que o atleta está pronto para a próxima faixa ou graduação (isso é decisão exclusiva do professor).`
        : '';

      const prompt = `Você é um assistente de treino do aplicativo Pacelog.
        ${sessionRules}

        Você recebeu dados estruturados de duas sessões de ${sportName}. Interprete a evolução ou mudança entre elas.${sportTipsInstruction}${cyclingInstruction}${jiujitsuInstruction}

        SESSÃO ATUAL (${currentData.period}):
        - Duração: ${currentData.durationMinutes} minutos
        - RPE: ${currentData.rpe}/10
        - Carga percebida (sRPE-TL): ${currentData.srpeLoad} AU
        - Métricas específicas: ${JSON.stringify(currentData.metrics)}
        ${currentData.notes ? `- Notas táticas do atleta: "${currentData.notes}"` : ''}

        ${previousData ? `SESSÃO ANTERIOR (${previousData.period}):
        - Duração: ${previousData.durationMinutes} minutos
        - RPE: ${previousData.rpe}/10
        - Carga percebida (sRPE-TL): ${previousData.srpeLoad} AU
        - Métricas específicas: ${JSON.stringify(previousData.metrics)}
        ${previousData.notes ? `- Notas táticas do atleta: "${previousData.notes}"` : ''}

        Compare as sessões. Destaque diferenças em carga percebida e métricas específicas da modalidade. Leve as notas táticas em consideração se houverem.` : `Esta é a primeira sessão registrada desta modalidade. Descreva o que os dados mostram sem comparar com histórico inexistente. Leve as notas táticas em consideração se houverem.`}

        Interpretação:`;

      if (!this.ai) {
        return previousData
          ? `Carga percebida: de ${previousData.srpeLoad} AU para ${currentLoad} AU em ${sportName}. Continue acompanhando suas métricas.`
          : `Primeira sessão de ${sportName} registrada. Carga percebida: ${currentLoad} AU. Continue registrando para construir histórico.`;
      }

      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
      });

      return response.text || 'Sessão finalizada. Continue acompanhando suas métricas de carga e desempenho.';
    } catch (error) {
      console.error('[InsightService] Gemini Session Generation Failed:', error);
      return 'Sessão registrada com sucesso. Acompanhe sua carga percebida nos próximos treinos.';
    }
  }

  private async generateDailyInsightFromGemini(userId: string): Promise<string> {
    try {
      const comparison = await progressService.getComparison(userId, 30);

      const aiContext = {
        period: comparison.period.label,
        overallConsistency: `${comparison.overall.consistencyPercent}% (baseline: ${comparison.overall.baselineConsistencyPercent}%)`,
        sports: comparison.sports.map(s => ({
          sportLabel: s.sportLabel,
          sessionsCount: `${s.sessions.current} vs ${s.sessions.baseline}`,
          primaryMetric: s.primaryMetric,
          evidence: s.evidence
        })),
        ranking: {
          mostImproved: comparison.ranking.mostImproved,
          mostConsistent: comparison.ranking.mostConsistent,
          mostEfficient: comparison.ranking.mostEfficient,
        },
        loadContext: comparison.loadContext
      };

      const prompt = `Você é o analista de evolução esportiva do PACELOG.
${AI_SYSTEM_RULES_V2}

## OBJETIVO PRINCIPAL
Sua única prioridade é identificar e explicar EVOLUÇÃO real do atleta no período.
Evolução = melhoria em uma métrica de desempenho (ex: pace, volume, distância, 1RM)
mantendo ou reduzindo a carga (sRPE-TL) necessária para atingi-la.
Consistência (frequência) é evolução secundária: treinar mais vezes que o período
anterior também conta como progresso, mesmo sem melhoria de métrica.

## O QUE NÃO É EVOLUÇÃO
- Carga mais alta sozinha, sem melhoria de métrica, NÃO é evolução.
- Volume maior sem melhoria de métrica é "aumento de volume", não "evolução".
- Se uma métrica melhorou mas a carga aumentou proporcionalmente mais, trate como
  "manutenção com maior esforço", não como evolução.

## REGRAS OBRIGATÓRIAS
1. Nunca use termos como "risco de lesão", "zona de perigo", "overtraining",
   "fadiga", "sobrecarga" ou qualquer linguagem médica/clínica.
2. Nunca faça diagnóstico, nunca recomende tratamento, nunca sugira ajuste de
   treino como se fosse prescrição.
3. Use SOMENTE os dados fornecidos abaixo. Não invente valores, datas, esportes
   ou relações de causa e efeito que não estejam explícitas nos dados.
4. Se os dados não permitirem identificar evolução clara em nenhum esporte,
   retorne "topProgress": [] e diga isso explicitamente no summary.
5. Toda métrica citada deve vir acompanhada do valor atual e do valor anterior
   (ou variação percentual), nunca uma afirmação de melhora sem os dois pontos.
6. Retorne ESTRITAMENTE um único objeto JSON válido. Sem markdown, sem \`\`\`json,
   sem texto antes ou depois do JSON.

## DADOS DISPONÍVEIS

Período analisado: ${aiContext.period}

Consistência geral:
${aiContext.overallConsistency}

Progresso por esporte (apenas modalidades com dados recentes):
${JSON.stringify(aiContext.sports, null, 2)}

Ranking calculado:
- Maior evolução (mostImproved): ${aiContext.ranking.mostImproved ?? 'Nenhum'}
- Maior consistência (mostConsistent): ${aiContext.ranking.mostConsistent ?? 'Nenhum'}
- Mais eficiente (mostEfficient): ${aiContext.ranking.mostEfficient ?? 'Nenhum'}

Contexto de carga (use apenas para qualificar se a evolução veio com mais ou
menos esforço; NUNCA trate isoladamente como evolução):
${JSON.stringify(aiContext.loadContext, null, 2)}

## FORMATO DE SAÍDA (JSON estrito)

{
  "headline": "string, máximo 60 caracteres, foco na maior evolução do período",
  "summary": "string, 2 a 4 frases, explica a evolução central usando valores concretos",
  "topProgress": [
    {
      "sportKey": "string, chave exata do esporte nos dados fornecidos",
      "metric": "string, nome da métrica que evoluiu",
      "previousValue": "string, valor anterior formatado",
      "currentValue": "string, valor atual formatado",
      "variation": "string, variação percentual ou absoluta",
      "loadNote": "string ou null, nota sobre carga apenas se relevante para qualificar a evolução",
      "description": "string, 1 a 2 frases explicando a evolução com os valores acima"
    }
  ],
  "hasEvolution": true ou false
}

Se não houver evolução identificável em nenhum esporte, retorne:
"topProgress": [] e "hasEvolution": false, com o summary explicando isso
de forma direta, sem inventar progresso.

Lembre-se: ${LOAD_DISCLAIMER}

Apenas o JSON. Nenhum texto antes ou depois.`;

      if (!this.ai) {
        return JSON.stringify({
          headline: 'Acompanhe sua evolução',
          summary: 'Continue registrando seus treinos para construir seu histórico de evolução.',
          topProgress: [],
          hasEvolution: false,
        });
      }

      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJsonStr = responseText.replace(/^\s*```(json)?|\s*```\s*$/gi, '').trim();
      
      const parsedData = JSON.parse(cleanJsonStr);
      aiProgressInsightSchema.parse(parsedData); // validador zod
      
      return JSON.stringify(parsedData);
    } catch (error) {
      console.error('[InsightService] Gemini Generation Failed:', error);
      return JSON.stringify({
        headline: 'Dados Insuficientes',
        summary: 'Não foi possível identificar sua evolução no momento. Continue registrando seus treinos.',
        topProgress: [],
        hasEvolution: false,
      });
    }
  }

  private mapToDTO(insight: IInsight): AIInsightDTO {
    return {
      id: insight._id.toString(),
      userId: insight.userId,
      content: insight.content,
      type: insight.type as any,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }
}

export const insightService = new InsightService();
