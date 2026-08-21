import { InsightModel, type IInsight } from './insight.model.js';
import { progressService } from '../progress/progress.service.js';
import { env } from '../../config/env.js';
import { GoogleGenAI } from '@google/genai';
import type { AIInsightDTO, SessionDTO } from '@pacelog/shared';
import { SessionModel } from '../sessions/session.model.js';

export class InsightService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  /**
   * Gera um insight diário baseado no ACWR e histórico do atleta.
   * Limita a geração a 1 por dia para economizar API.
   */
  async getDailyInsight(userId: string): Promise<AIInsightDTO> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Verifica se já existe um insight gerado hoje
    const existingInsight = await InsightModel.findOne({
      userId,
      createdAt: { $gte: today },
      type: 'daily_coach'
    }).sort({ createdAt: -1 });

    if (existingInsight) {
      return this.mapToDTO(existingInsight);
    }

    // 2. Se não existir, gera um novo.
    const insightContent = await this.generateInsightFromGemini(userId);

    const newInsight = await InsightModel.create({
      userId,
      content: insightContent,
      type: 'daily_coach'
    });

    return this.mapToDTO(newInsight);
  }

  async getExistingSessionInsight(userId: string, sessionId: string): Promise<AIInsightDTO | null> {
    const existingInsight = await InsightModel.findOne({
      userId,
      sessionId,
      type: 'session_analysis'
    });
    if (!existingInsight) return null;
    return this.mapToDTO(existingInsight);
  }

  /**
   * Gera ou recupera um insight comparativo entre a sessão atual e a anterior do mesmo esporte.
   */
  async getSessionComparisonInsight(userId: string, sessionId: string): Promise<AIInsightDTO> {
    // 1. Verifica se já existe um insight salvo para esta sessão
    const existingInsight = await InsightModel.findOne({
      userId,
      sessionId,
      type: 'session_analysis'
    });

    if (existingInsight) {
      return this.mapToDTO(existingInsight);
    }

    // 2. Busca a sessão alvo
    const currentSession = await SessionModel.findOne({ _id: sessionId, userId });
    if (!currentSession) {
      throw new Error('Sessão não encontrada');
    }

    // 3. Busca a sessão anterior do mesmo esporte
    const previousSession = await SessionModel.findOne({
      userId,
      sportKey: currentSession.sportKey,
      startedAt: { $lt: currentSession.startedAt }
    }).sort({ startedAt: -1 });

    // 4. Gera insight com o Gemini
    const insightContent = await this.generateSessionInsightFromGemini(currentSession, previousSession);

    // 5. Salva no banco
    const newInsight = await InsightModel.create({
      userId,
      sessionId,
      content: insightContent,
      type: 'session_analysis'
    });

    return this.mapToDTO(newInsight);
  }

  private async generateSessionInsightFromGemini(current: any, previous: any | null): Promise<string> {
    try {
      const sportName = current.sportKey;
      let prompt = `Você é um "High-Performance Coach" especialista em fisiologia do exercício trabalhando no aplicativo Pacelog.
      Sua resposta deve ter no máximo 2 parágrafos curtos, ser direta, altamente técnica e tática, sem saudações ou clichês motivacionais.
      Seu objetivo principal é avaliar a EFICIÊNCIA DO TREINO cruzando o RPE (esforço percebido) com a métrica de volume/intensidade do esporte (${sportName}).
      
      Regras de Análise:
      - Menos RPE para o mesmo volume/intensidade = ganho de condicionamento/eficiência.
      - Mais RPE para o mesmo volume = sinal de fadiga residual ou má recuperação.
      - Se for Musculação (strength), analise volume total vs repetições.
      - Se for Corrida (running), analise pace vs frequência cardíaca ou RPE.
      - Se for Boxe (boxing), analise quantidade de rounds.`;

      if (previous) {
        prompt += `\n\nCompare a sessão ATUAL com a ANTERIOR e destaque a evolução ou queda de performance:
        [TREINO ANTERIOR]
        Duração: ${Math.round(previous.durationSeconds / 60)} min | Esforço (RPE): ${previous.rpe}/10 | Carga Fisiológica: ${previous.sessionalLoad}
        Métricas Específicas: ${JSON.stringify(previous.metrics)}
        
        [TREINO ATUAL (O que acabou de ser feito)]
        Duração: ${Math.round(current.durationSeconds / 60)} min | Esforço (RPE): ${current.rpe}/10 | Carga Fisiológica: ${current.sessionalLoad}
        Métricas Específicas: ${JSON.stringify(current.metrics)}
        
        Feedback Analítico:`;
      } else {
        prompt += `\n\nEste é o primeiro treino registrado desta modalidade. Crie uma linha de base (baseline) tática.
        [TREINO ATUAL]
        Duração: ${Math.round(current.durationSeconds / 60)} min | Esforço (RPE): ${current.rpe}/10 | Carga Fisiológica: ${current.sessionalLoad}
        Métricas Específicas: ${JSON.stringify(current.metrics)}
        
        Feedback Analítico:`;
      }

      if (!this.ai) {
        return previous 
          ? `Sua carga de treino variou de ${previous.sessionalLoad} para ${current.sessionalLoad}. Continue focado nos seus marcadores de evolução em ${sportName}.` 
          : `Bom primeiro treino de ${sportName}. A consistência é a chave.`;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || 'Continue treinando focado em suas métricas base.';
    } catch (error) {
      console.error('[InsightService] Gemini Session Generation Failed:', error);
      return 'Treino finalizado com sucesso. Monitore sua percepção de esforço no próximo treino.';
    }
  }

  private async generateInsightFromGemini(userId: string): Promise<string> {
    try {
      const overview = await progressService.getOverview(userId);

      // Prompt Context Builder
      const acwrText = `ACWR: ${overview.acwr.ratio} (${overview.acwr.status}). ${overview.acwr.message}`;
      const streakText = `Sequência: ${overview.totalActiveDaysStreak} dias.`;
      
      const prsText = overview.recentPersonalRecords.length > 0
        ? `Últimos PRs batidos: ${overview.recentPersonalRecords.map(pr => pr.metricLabel + ' ' + pr.value).join(', ')}.`
        : 'Nenhum recorde recente.';

      const prompt = `Você é um "High-Performance Coach" direto, tático e pragmático de um aplicativo chamado Pacelog. 
        Sua resposta deve ser curta (máximo 3 parágrafos curtos) e sem saudações genéricas como "Olá" ou "Bom dia".
        Analise os seguintes dados do atleta e dê uma recomendação de treino ou recuperação.
        Se o ACWR estiver em "danger_zone" ou "over-reaching", recomende cautela e descanso.
        Se o ACWR estiver em "optimal", incentive a manter o ritmo.
        Se o ACWR estiver em "under-training", sugira aumentar gradativamente a intensidade.

        Métricas Atuais:
        - ${acwrText}
        - ${streakText}
        - Carga semanal total: ${overview.weeklyTotalSessionalLoad}
        - Duração semanal total: ${Math.round(overview.weeklyTotalDurationSeconds / 60)} minutos
        - ${prsText}

        Recomendação:`;

      if (!this.ai) {
        // Fallback gracefully se a chave não estiver configurada (útil em dev/testes)
        return `Baseado no seu ACWR atual de ${overview.acwr.ratio}, ${overview.acwr.message}`;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || 'Continue monitorando suas métricas de evolução diária.';
    } catch (error) {
      console.error('[InsightService] Gemini Generation Failed:', error);
      return 'Continue treinando duro e acompanhando sua telemetria. Os dados fisiológicos mostram consistência.';
    }
  }

  private mapToDTO(insight: IInsight): AIInsightDTO {
    return {
      id: insight._id.toString(),
      userId: insight.userId,
      content: insight.content,
      type: insight.type as any,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt
    };
  }
}

export const insightService = new InsightService();
