import { InsightModel, type IInsight } from './insight.model.js';
import { progressService } from '../progress/progress.service.js';
import { env } from '../../config/env.js';
import { GoogleGenAI } from '@google/genai';
import type { AIInsightDTO } from '@pacelog/shared';

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
        model: 'gemini-pro-latest',
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
