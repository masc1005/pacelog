import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { enqueueOperation } from '../pwa/services/syncQueue.service';
import type {
  UserSettingsDTO,
  TrainingReminder,
  UserSportDTO,
  SportMetricConfig,
} from '@pacelog/shared';

const LOCAL_STORAGE_SETTINGS_KEY = 'pacelog_user_settings_cache';

interface SettingsContextType {
  settings: UserSettingsDTO | null;
  userSports: UserSportDTO[];
  isLoading: boolean;
  updateSettings: (partial: Partial<UserSettingsDTO>) => Promise<UserSettingsDTO>;
  addReminder: (reminder: Omit<TrainingReminder, 'id'>) => Promise<void>;
  deleteReminder: (reminderId: string) => Promise<void>;
  toggleReminder: (reminderId: string, enabled: boolean) => Promise<void>;
  loadUserSports: () => Promise<void>;
  createCustomSport: (input: {
    displayName: string;
    icon?: string;
    color?: string;
    metricsConfig?: SportMetricConfig[];
  }) => Promise<UserSportDTO>;
  updateSport: (
    sportKey: string,
    input: { isActive?: boolean; defaultGearId?: string | null; metricsConfig?: SportMetricConfig[] }
  ) => Promise<UserSportDTO>;
  restoreSportMetrics: (sportKey: string) => Promise<UserSportDTO>;
  // Formatters
  formatDistance: (km: number, digits?: number) => string;
  formatWeight: (kg: number, digits?: number) => string;
  formatSpeed: (kmh: number, digits?: number) => string;
  formatPace: (secondsPerKm: number) => string;
  formatTime: (dateOrIso: Date | string) => string;
}

const defaultSettings: UserSettingsDTO = {
  id: 'default',
  userId: 'default',
  distanceUnit: 'km',
  weightUnit: 'kg',
  timeFormat: '24h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bahia',
  language: 'pt-BR',
  theme: 'dark',
  weekStart: 'monday',
  weeklyVolumeGoalMinutes: 240,
  streakGraceDays: 1,
  weeklyDigestEnabled: true,
  notificationsEnabled: true,
  trainingReminders: [],
  achievementNotificationsEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [settings, setSettings] = useState<UserSettingsDTO>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return defaultSettings;
  });

  const [userSports, setUserSports] = useState<UserSportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Aplica tema dark/light dinamicamente no documento
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [settings.theme]);

  // Carrega configurações do usuário logado
  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const data = await apiClient<UserSettingsDTO>('/api/settings');
      setSettings(data);
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Usando configurações em cache local:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Carrega esportes customizados e oficiais
  const loadUserSports = useCallback(async () => {
    if (!user) return;
    try {
      const sports = await apiClient<UserSportDTO[]>('/api/settings/sports');
      setUserSports(sports);
    } catch (error) {
      console.error('Erro ao carregar esportes:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadUserSports();
    }
  }, [user, loadSettings, loadUserSports]);

  // Atualiza configurações (com suporte a fila offline)
  const updateSettings = async (partial: Partial<UserSettingsDTO>): Promise<UserSettingsDTO> => {
    const optimistic = { ...settings, ...partial, updatedAt: new Date().toISOString() };
    setSettings(optimistic);
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(optimistic));

    try {
      const updated = await apiClient<UserSettingsDTO>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(partial),
      });
      setSettings(updated);
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      if (error instanceof ApiError && error.status === 0 && user) {
        await enqueueOperation('update_settings', partial as Record<string, unknown>, {
          userId: user.id,
          clientUuid: crypto.randomUUID(),
          entityTable: 'settings',
          apiEndpoint: '/api/settings',
          method: 'PATCH',
        });
        addToast('Configurações salvas localmente. Sincronizando quando online.', 'info');
        return optimistic;
      }
      addToast('Erro ao salvar configurações', 'error');
      throw error;
    }
  };

  // Lembretes de treino
  const addReminder = async (reminder: Omit<TrainingReminder, 'id'>): Promise<void> => {
    try {
      const updated = await apiClient<UserSettingsDTO>('/api/settings/reminders', {
        method: 'POST',
        body: JSON.stringify(reminder),
      });
      setSettings(updated);
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      addToast('Lembrete de treino adicionado', 'success');
    } catch (error) {
      addToast('Erro ao adicionar lembrete', 'error');
      throw error;
    }
  };

  const deleteReminder = async (reminderId: string): Promise<void> => {
    try {
      const updated = await apiClient<UserSettingsDTO>(`/api/settings/reminders/${reminderId}`, {
        method: 'DELETE',
      });
      setSettings(updated);
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      addToast('Lembrete removido', 'info');
    } catch (error) {
      addToast('Erro ao remover lembrete', 'error');
      throw error;
    }
  };

  const toggleReminder = async (reminderId: string, enabled: boolean): Promise<void> => {
    const previousSettings = settings;
    const updatedReminders = settings.trainingReminders.map((r) =>
      r.id === reminderId ? { ...r, enabled } : r
    );
    const optimistic = { ...settings, trainingReminders: updatedReminders };
    setSettings(optimistic);
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(optimistic));

    try {
      const updated = await apiClient<UserSettingsDTO>(`/api/settings/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      setSettings(updated);
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      if (error instanceof ApiError && error.status === 0 && user) {
        await enqueueOperation(
          'update_settings',
          { enabled },
          {
            userId: user.id,
            clientUuid: crypto.randomUUID(),
            entityTable: 'settings',
            apiEndpoint: `/api/settings/reminders/${reminderId}`,
            method: 'PATCH',
          }
        );
        return;
      }
      setSettings(previousSettings);
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(previousSettings));
      addToast('Erro ao atualizar lembrete', 'error');
      throw error;
    }
  };

  // Esportes Customizados e Configuração de Métricas
  const createCustomSport = async (input: {
    displayName: string;
    icon?: string;
    color?: string;
    metricsConfig?: SportMetricConfig[];
  }): Promise<UserSportDTO> => {
    try {
      const sport = await apiClient<UserSportDTO>('/api/settings/sports/custom', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setUserSports((prev) => [...prev, sport]);
      addToast(`Esporte "${input.displayName}" adicionado com sucesso`, 'success');
      return sport;
    } catch (error) {
      addToast('Erro ao criar esporte personalizado', 'error');
      throw error;
    }
  };

  const updateSport = async (
    sportKey: string,
    input: { isActive?: boolean; defaultGearId?: string | null; metricsConfig?: SportMetricConfig[] }
  ): Promise<UserSportDTO> => {
    try {
      const sport = await apiClient<UserSportDTO>(`/api/settings/sports/${sportKey}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      setUserSports((prev) => prev.map((s) => (s.sportKey === sportKey ? sport : s)));
      addToast('Configuração de esporte salva', 'success');
      return sport;
    } catch (error) {
      addToast('Erro ao atualizar esporte', 'error');
      throw error;
    }
  };

  const restoreSportMetrics = async (sportKey: string): Promise<UserSportDTO> => {
    try {
      const sport = await apiClient<UserSportDTO>(`/api/settings/sports/${sportKey}/metrics/restore`, {
        method: 'POST',
      });
      setUserSports((prev) => prev.map((s) => (s.sportKey === sportKey ? sport : s)));
      addToast('Métricas restauradas para o padrão de fábrica', 'info');
      return sport;
    } catch (error) {
      addToast('Erro ao restaurar métricas', 'error');
      throw error;
    }
  };

  // Funções Utilitárias de Conversão para Exibição
  const formatDistance = (km: number, digits: number = 2): string => {
    if (km == null || isNaN(km)) return settings.distanceUnit === 'mi' ? '0 mi' : '0 km';
    if (settings.distanceUnit === 'mi') {
      const miles = km * 0.621371;
      return `${miles.toFixed(digits)} mi`;
    }
    return `${km.toFixed(digits)} km`;
  };

  const formatWeight = (kg: number, digits: number = 1): string => {
    if (kg == null || isNaN(kg)) return settings.weightUnit === 'lb' ? '0 lb' : '0 kg';
    if (settings.weightUnit === 'lb') {
      const lbs = kg * 2.20462;
      return `${lbs.toFixed(digits)} lb`;
    }
    return `${kg.toFixed(digits)} kg`;
  };

  const formatSpeed = (kmh: number, digits: number = 1): string => {
    if (kmh == null || isNaN(kmh)) return settings.distanceUnit === 'mi' ? '0 mph' : '0 km/h';
    if (settings.distanceUnit === 'mi') {
      const mph = kmh * 0.621371;
      return `${mph.toFixed(digits)} mph`;
    }
    return `${kmh.toFixed(digits)} km/h`;
  };

  const formatPace = (secondsPerKm: number): string => {
    if (!secondsPerKm || isNaN(secondsPerKm) || secondsPerKm <= 0) {
      return settings.distanceUnit === 'mi' ? '--:-- /mi' : '--:-- /km';
    }
    const sec = settings.distanceUnit === 'mi' ? secondsPerKm * 1.60934 : secondsPerKm;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    const unitLabel = settings.distanceUnit === 'mi' ? '/mi' : '/km';
    return `${m}:${String(s).padStart(2, '0')} ${unitLabel}`;
  };

  const formatTime = (dateOrIso: Date | string): string => {
    const date = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: settings.timeFormat === '12h',
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        userSports,
        isLoading,
        updateSettings,
        addReminder,
        deleteReminder,
        toggleReminder,
        loadUserSports,
        createCustomSport,
        updateSport,
        restoreSportMetrics,
        formatDistance,
        formatWeight,
        formatSpeed,
        formatPace,
        formatTime,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
}
