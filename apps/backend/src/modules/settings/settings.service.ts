import { UserSettingsModel, type IUserSettings } from './settings.model.js';
import { UserSportModel, type IUserSport } from './userSport.model.js';
import { OFFICIAL_SPORTS } from '../sports/sport.seed.js';
import { randomUUID } from 'crypto';
import type {
  UserSettingsDTO,
  TrainingReminder,
  UserSportDTO,
  SportMetricConfig,
} from '@pacelog/shared';

export class SettingsService {
  /**
   * Obtém ou inicializa as configurações do usuário com valores padrão
   */
  async getSettings(userId: string): Promise<UserSettingsDTO> {
    let settings = await UserSettingsModel.findOne({ userId });

    if (!settings) {
      settings = await UserSettingsModel.create({
        userId,
        distanceUnit: 'km',
        weightUnit: 'kg',
        timeFormat: '24h',
        timezone: 'America/Bahia',
        language: 'pt-BR',
        theme: 'dark',
        weekStart: 'monday',
        weeklyVolumeGoalMinutes: 240,
        streakGraceDays: 1,
        weeklyDigestEnabled: true,
        notificationsEnabled: true,
        trainingReminders: [],
        achievementNotificationsEnabled: true,
      });
    }

    return this.mapSettingsToDTO(settings);
  }

  /**
   * Atualização parcial (PATCH) das preferências
   */
  async updateSettings(userId: string, input: Partial<UserSettingsDTO>): Promise<UserSettingsDTO> {
    const settings = await UserSettingsModel.findOneAndUpdate(
      { userId },
      { $set: input },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return this.mapSettingsToDTO(settings);
  }

  /**
   * Adiciona um novo lembrete de treino
   */
  async addReminder(
    userId: string,
    reminderData: Omit<TrainingReminder, 'id'>
  ): Promise<TrainingReminder[]> {
    const newReminder: TrainingReminder = {
      id: randomUUID(),
      weekday: reminderData.weekday,
      time: reminderData.time,
      sportKey: reminderData.sportKey,
      enabled: reminderData.enabled ?? true,
    };

    const settings = await UserSettingsModel.findOneAndUpdate(
      { userId },
      { $push: { trainingReminders: newReminder } },
      { new: true, upsert: true }
    );

    return settings.trainingReminders;
  }

  /**
   * Remove um lembrete de treino pelo ID
   */
  async deleteReminder(userId: string, reminderId: string): Promise<TrainingReminder[]> {
    const settings = await UserSettingsModel.findOneAndUpdate(
      { userId },
      { $pull: { trainingReminders: { id: reminderId } } },
      { new: true }
    );

    return settings ? settings.trainingReminders : [];
  }

  /**
   * Atualiza status enabled de um lembrete
   */
  async toggleReminder(userId: string, reminderId: string, enabled: boolean): Promise<TrainingReminder[]> {
    const settings = await UserSettingsModel.findOneAndUpdate(
      { userId, 'trainingReminders.id': reminderId },
      { $set: { 'trainingReminders.$.enabled': enabled } },
      { new: true }
    );

    return settings ? settings.trainingReminders : [];
  }

  /**
   * Retorna todos os esportes do usuário (oficiais e personalizados)
   */
  async getUserSports(userId: string): Promise<UserSportDTO[]> {
    // 1. Busca esportes já salvos para este usuário
    let userSports = await UserSportModel.find({ userId }).sort({ isCustom: 1, createdAt: 1 });

    // 2. Se for o primeiro acesso, popula com os esportes oficiais
    if (userSports.length === 0) {
      const initialSports = OFFICIAL_SPORTS.map((os, index) => ({
        userId,
        sportKey: os.sportKey,
        isCustom: false,
        displayName: os.name,
        icon: os.icon,
        color: os.color,
        isActive: true,
        metricsConfig: os.supportedMetrics.map((m, idx) => ({
          metricKey: m,
          label: this.formatMetricLabel(m),
          visible: true,
          order: idx,
          isDefault: true,
          isMandatory: idx === 0, // A primeira métrica do esporte é mandatória
        })),
      }));

      await UserSportModel.insertMany(initialSports);
      userSports = await UserSportModel.find({ userId }).sort({ isCustom: 1, createdAt: 1 });
    }

    return userSports.map((s) => this.mapSportToDTO(s));
  }

  /**
   * Cria um novo esporte customizado
   */
  async createCustomSport(
    userId: string,
    input: {
      displayName: string;
      icon?: string;
      color?: string;
      metricsConfig?: SportMetricConfig[];
    }
  ): Promise<UserSportDTO> {
    const sportKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const defaultMetrics: SportMetricConfig[] = input.metricsConfig || [
      { metricKey: 'durationMinutes', label: 'Duração (minutos)', visible: true, order: 0, isDefault: true, isMandatory: true },
      { metricKey: 'rpe', label: 'RPE (Esforço)', visible: true, order: 1, isDefault: true, isMandatory: true },
      { metricKey: 'notes', label: 'Observações / Notas', visible: true, order: 2, isDefault: true, isMandatory: false },
    ];

    const newSport = await UserSportModel.create({
      userId,
      sportKey,
      isCustom: true,
      displayName: input.displayName,
      icon: input.icon || 'Activity',
      color: input.color || '#D4F684',
      isActive: true,
      metricsConfig: defaultMetrics,
    });

    return this.mapSportToDTO(newSport);
  }

  /**
   * Atualiza status ativo/inativo ou métricas de um esporte
   */
  async updateSport(
    userId: string,
    sportKey: string,
    input: { isActive?: boolean; metricsConfig?: SportMetricConfig[] }
  ): Promise<UserSportDTO> {
    const updateObj: Record<string, any> = {};
    if (input.isActive !== undefined) updateObj.isActive = input.isActive;
    if (input.metricsConfig !== undefined) updateObj.metricsConfig = input.metricsConfig;

    const updated = await UserSportModel.findOneAndUpdate(
      { userId, sportKey },
      { $set: updateObj },
      { new: true }
    );

    if (!updated) {
      throw new Error(`Esporte '${sportKey}' não encontrado para o usuário`);
    }

    return this.mapSportToDTO(updated);
  }

  /**
   * Restaura configuração de métricas de um esporte para o padrão original
   */
  async restoreSportMetrics(userId: string, sportKey: string): Promise<UserSportDTO> {
    const official = OFFICIAL_SPORTS.find((os) => os.sportKey === sportKey);

    let defaultMetrics: SportMetricConfig[] = [];
    if (official) {
      defaultMetrics = official.supportedMetrics.map((m, idx) => ({
        metricKey: m,
        label: this.formatMetricLabel(m),
        visible: true,
        order: idx,
        isDefault: true,
        isMandatory: idx === 0,
      }));
    } else {
      defaultMetrics = [
        { metricKey: 'durationMinutes', label: 'Duração (minutos)', visible: true, order: 0, isDefault: true, isMandatory: true },
        { metricKey: 'rpe', label: 'RPE (Esforço)', visible: true, order: 1, isDefault: true, isMandatory: true },
        { metricKey: 'notes', label: 'Observações / Notas', visible: true, order: 2, isDefault: true, isMandatory: false },
      ];
    }

    const updated = await UserSportModel.findOneAndUpdate(
      { userId, sportKey },
      { $set: { metricsConfig: defaultMetrics } },
      { new: true }
    );

    if (!updated) {
      throw new Error(`Esporte '${sportKey}' não encontrado`);
    }

    return this.mapSportToDTO(updated);
  }

  private mapSettingsToDTO(settings: IUserSettings): UserSettingsDTO {
    return {
      id: settings._id.toString(),
      userId: settings.userId,
      distanceUnit: settings.distanceUnit,
      weightUnit: settings.weightUnit,
      timeFormat: settings.timeFormat,
      timezone: settings.timezone,
      language: settings.language,
      theme: settings.theme,
      weekStart: settings.weekStart,
      weeklyVolumeGoalMinutes: settings.weeklyVolumeGoalMinutes,
      streakGraceDays: settings.streakGraceDays,
      weeklyDigestEnabled: settings.weeklyDigestEnabled,
      notificationsEnabled: settings.notificationsEnabled,
      trainingReminders: settings.trainingReminders || [],
      achievementNotificationsEnabled: settings.achievementNotificationsEnabled,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  private mapSportToDTO(sport: IUserSport): UserSportDTO {
    return {
      id: sport._id.toString(),
      userId: sport.userId,
      sportKey: sport.sportKey,
      isCustom: sport.isCustom,
      displayName: sport.displayName,
      icon: sport.icon,
      color: sport.color,
      isActive: sport.isActive,
      metricsConfig: sport.metricsConfig || [],
      createdAt: sport.createdAt,
      updatedAt: sport.updatedAt,
    };
  }

  private formatMetricLabel(key: string): string {
    const labels: Record<string, string> = {
      distanceKm: 'Distância (km)',
      pace: 'Pace Médio',
      elevationGainM: 'Ganho de Elevação (m)',
      cadence: 'Cadência (spm)',
      heartRate: 'Frequência Cardíaca (bpm)',
      goals: 'Gols',
      assists: 'Assistências',
      result: 'Resultado da Partida',
      rpe: 'Percepção de Esforço (RPE)',
      position: 'Posição Tática',
      sets: 'Sets Disputados',
      pointsFor: 'Pontos Pró',
      pointsAgainst: 'Pontos Contra',
      won: 'Vitória / Derrota',
      courtType: 'Tipo de Quadra / Areia',
      rounds: 'Rounds',
      durationSeconds: 'Duração do Round',
      restSeconds: 'Descanso entre Rounds',
      punchesThrown: 'Golpes Lançados',
      punchesLanded: 'Golpes Conectados',
      exercises: 'Exercícios',
      repetitions: 'Repetições',
      loadKg: 'Carga (kg)',
      loadMode: 'Modo de Carga',
      totalVolumeKg: 'Volume Total (kg)',
      averageSpeedKmh: 'Velocidade Média (km/h)',
      cyclingType: 'Tipo de Pedal',
      primaryStroke: 'Estilo Principal',
      totalLaps: 'Piscinas / Voltas',
      totalDistanceMeters: 'Distância Total (m)',
      swolf: 'SWOLF Score',
      totalRounds: 'Total de Rolas',
      gi: 'Com Kimono (Gi)',
      submissionsFor: 'Finalizações Aplicadas',
      submissionsAgainst: 'Finalizações Sofridas',
    };

    return labels[key] || key;
  }
}

export const settingsService = new SettingsService();
