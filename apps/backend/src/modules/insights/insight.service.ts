import { InsightModel, type IInsight } from './insight.model.js';
import { progressService } from '../progress/progress.service.js';
import { env } from '../../config/env.js';
import { GoogleGenAI } from '@google/genai';
import type { AIInsightDTO } from '@pacelog/shared';
import { SessionModel } from '../sessions/session.model.js';
import { LOAD_DISCLAIMER } from '../progress/baseline.service.js';
import { z } from 'zod';

const aiProgressInsightSchema = z.object({
  headline: z.string().describe('Um título curto e motivador resumindo a evolução atual (ex: "Consistência no Boxe e Melhora no Pace")'),
  summary: z.string().describe('Um parágrafo curto (max 2 frases) avaliando o progresso do usuário no período. Foco em consistência, evolução relativa e esforço investido.'),
  topProgress: z.array(z.object({
    sportKey: z.string(),
    metric: z.string(),
    description: z.string().describe('Explicação de uma frase do porquê foi uma evolução (ex: "Seu pace caiu de 6:05 para 5:45 mantendo o mesmo volume.")')
  })).describe('Lista dos 2 maiores destaques de progresso no período, baseados em métricas ou consistência.')
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

      const prompt = `Você é um assistente de treino do aplicativo Pacelog.
        ${sessionRules}

        Você recebeu dados estruturados de duas sessões de ${sportName}. Interprete a evolução ou mudança entre elas.${sportTipsInstruction}

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
        model: 'gemini-2.5-flash',
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

      const prompt = `Você é o analista de progresso esportivo do PACELOG.
${AI_SYSTEM_RULES_V2}

Você recebeu os seguintes dados de progresso dos últimos ${aiContext.period}:

DADOS DE CONSISTÊNCIA GERAL:
${aiContext.overallConsistency}

PROGRESSO POR ESPORTE (Apenas as modalidades com dados recentes):
${JSON.stringify(aiContext.sports, null, 2)}

RANKING CALCULADO:
- Maior Evolução (mostImproved): ${aiContext.ranking.mostImproved ?? 'Nenhum'}
- Maior Consistência (mostConsistent): ${aiContext.ranking.mostConsistent ?? 'Nenhum'}
- Mais Eficiente (mostEfficient): ${aiContext.ranking.mostEfficient ?? 'Nenhum'}

CONTEXTO DE CARGA (Para não interpretar carga isolada como evolução):
${JSON.stringify(aiContext.loadContext, null, 2)}

Sua tarefa: Retornar um JSON válido com a seguinte estrutura:
{
  "headline": "Título curto",
  "summary": "Parágrafo resumindo a evolução",
  "topProgress": [{"sportKey": "...", "metric": "...", "description": "..."}]
}
Lembre que: ${LOAD_DISCLAIMER}

Apenas o JSON, sem markdown.`;

      if (!this.ai) {
        return JSON.stringify({
          headline: 'Acompanhe seu progresso',
          summary: 'Continue registrando seus treinos para construir seu histórico.',
          topProgress: []
        });
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
        summary: 'Não foi possível gerar seu insight de evolução agora. Continue registrando seus treinos.',
        topProgress: []
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
