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
    input: { isActive?: boolean; metricsConfig?: SportMetricConfig[] }
  ) => Promise<UserSportDTO>;
  restoreSportMetrics: (sportKey: string) => Promise<UserSportDTO>;
  // Formatters
  formatDistance: (km: number, digits?: number) => string;
  formatWeight: (kg: number, digits?: number) => string;
  formatSpeed: (kmh: number, digits?: number) => string;
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

  // Atualização de configurações com aplicação otimista
  const updateSettings = async (partial: Partial<UserSettingsDTO>): Promise<UserSettingsDTO> => {
    // 1. Atualização otimista
    const updatedLocally: UserSettingsDTO = { ...settings, ...partial };
    setSettings(updatedLocally);
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updatedLocally));

    try {
      const data = await apiClient<UserSettingsDTO>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(partial),
      });
      setSettings(data);
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(data));
      addToast('Preferências salvas com sucesso', 'success');
      return data;
    } catch (error) {
      const isNetworkError = error instanceof ApiError && error.status === 0;
      if (isNetworkError && user) {
        // Enfileirar para sincronização posterior
        const clientUuid = crypto.randomUUID();
        await enqueueOperation(
          'update_settings',
          partial as Record<string, unknown>,
          {
            userId: user.id,
            clientUuid,
            entityTable: 'settings',
            apiEndpoint: '/api/settings',
            method: 'PATCH',
          }
        );
        addToast('Preferências salvas offline. Sincronizando quando a conexão voltar.', 'info');
        return updatedLocally;
      }
      addToast('Erro ao salvar preferências no servidor', 'error');
      throw error;
    }
  };

  const addReminder = async (reminder: Omit<TrainingReminder, 'id'>) => {
    try {
      const reminders = await apiClient<TrainingReminder[]>('/api/settings/reminders', {
        method: 'POST',
        body: JSON.stringify(reminder),
      });
      setSettings((prev) => ({ ...prev, trainingReminders: reminders }));
      addToast('Lembrete de treino adicionado', 'success');
    } catch (error) {
      addToast('Erro ao adicionar lembrete', 'error');
      throw error;
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const reminders = await apiClient<TrainingReminder[]>(`/api/settings/reminders/${reminderId}`, {
        method: 'DELETE',
      });
      setSettings((prev) => ({ ...prev, trainingReminders: reminders }));
      addToast('Lembrete removido', 'info');
    } catch (error) {
      addToast('Erro ao remover lembrete', 'error');
      throw error;
    }
  };

  const toggleReminder = async (reminderId: string, enabled: boolean) => {
    const updated = settings.trainingReminders.map((r) =>
      r.id === reminderId ? { ...r, enabled } : r
    );
    setSettings((prev) => ({ ...prev, trainingReminders: updated }));

    try {
      await updateSettings({ trainingReminders: updated } as any);
    } catch {
      // rollback se falhar
    }
  };

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
    input: { isActive?: boolean; metricsConfig?: SportMetricConfig[] }
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
    if (km == null || isNaN(km)) return '0 km';
    if (settings.distanceUnit === 'mi') {
      const miles = km * 0.621371;
      return `${miles.toFixed(digits)} mi`;
    }
    return `${km.toFixed(digits)} km`;
  };

  const formatWeight = (kg: number, digits: number = 1): string => {
    if (kg == null || isNaN(kg)) return '0 kg';
    if (settings.weightUnit === 'lb') {
      const lbs = kg * 2.20462;
      return `${lbs.toFixed(digits)} lb`;
    }
    return `${kg.toFixed(digits)} kg`;
  };

  const formatSpeed = (kmh: number, digits: number = 1): string => {
    if (kmh == null || isNaN(kmh)) return '0 km/h';
    if (settings.distanceUnit === 'mi') {
      const mph = kmh * 0.621371;
      return `${mph.toFixed(digits)} mph`;
    }
    return `${kmh.toFixed(digits)} km/h`;
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
