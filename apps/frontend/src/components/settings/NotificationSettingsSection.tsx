import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { useSettings } from '../../hooks/useSettings';
import { TrainingReminderModal } from './TrainingReminderModal';
import { Bell, Trophy, Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { SPORT_LABELS } from '../../lib/utils';

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const NotificationSettingsSection: React.FC = () => {
  const { settings, updateSettings, deleteReminder, toggleReminder } = useSettings();
  const [showAddModal, setShowAddModal] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  if (!settings) return null;

  const requestBrowserPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        updateSettings({ notificationsEnabled: true });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Notificações e Lembretes
        </h2>
        <p className="font-mono text-xs text-[#8F9380] mt-0.5">
          Configure avisos de treino, notificações de conquistas e permissões do navegador.
        </p>
      </div>

      {/* Permissão do Navegador */}
      <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#D4F684]">
            {browserPermission === 'granted' ? (
              <ShieldCheck className="w-5 h-5 text-[#D4F684]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#FFB800]" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wide">
              Permissão do Navegador
            </span>
            <span className="text-xs text-[#8F9380]">
              {browserPermission === 'granted'
                ? 'Notificações autorizadas neste dispositivo.'
                : 'Permita notificações para receber lembretes de treinos e alertas de conquistas.'}
            </span>
          </div>
        </div>

        {browserPermission !== 'granted' && (
          <button
            type="button"
            onClick={requestBrowserPermission}
            className="py-2 px-3 bg-[#D4F684] text-[#051424] font-mono text-xs uppercase font-bold tracking-wider rounded-lg shadow-[0_0_15px_rgba(212,246,132,0.3)] hover:opacity-90 transition-all flex-shrink-0"
          >
            Ativar Permissão
          </button>
        )}
      </Card>

      {/* Toggles de Notificação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle Geral */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#38BDF8]">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-[#D4E4FA] uppercase">
                Notificações Gerais
              </span>
              <span className="text-[11px] text-[#8F9380]">Alertas de ACWR e sequências</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              updateSettings({ notificationsEnabled: !settings.notificationsEnabled })
            }
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.notificationsEnabled ? 'bg-[#38BDF8]' : 'bg-[#161C24] border border-[#1F2937]'
            }`}
            aria-label="Alternar Notificações Gerais"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </Card>

        {/* Toggle de Conquistas e PRs */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#FFB800]">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-[#D4E4FA] uppercase">
                Alertas de Conquista
              </span>
              <span className="text-[11px] text-[#8F9380]">Recordes pessoais (PRs) e metas</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              updateSettings({
                achievementNotificationsEnabled: !settings.achievementNotificationsEnabled,
              })
            }
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.achievementNotificationsEnabled
                ? 'bg-[#FFB800]'
                : 'bg-[#161C24] border border-[#1F2937]'
            }`}
            aria-label="Alternar Alertas de Conquista"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.achievementNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </Card>
      </div>

      {/* Lembretes de Treino Agendados */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Lembretes de Treino
            </label>
            <span className="text-[11px] text-[#8F9380]">
              Alertas periódicos programados por dia e horário.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#D4E4FA] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
            Adicionar
          </button>
        </div>

        {settings.trainingReminders.length === 0 ? (
          <Card className="p-6 bg-[#0D1C2D] border border-dashed border-[#1F2937] flex flex-col items-center justify-center gap-1 text-center">
            <span className="font-mono text-xs text-[#8F9380] uppercase">
              Nenhum lembrete configurado
            </span>
            <span className="text-xs text-[#C5C8B4]">
              Adicione horários para manter sua consistência esportiva.
            </span>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {settings.trainingReminders.map((rem) => (
              <Card
                key={rem.id}
                className="p-4 bg-[#0D1C2D] border-[#1F2937] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#161C24] border border-[#1F2937] flex flex-col items-center justify-center font-mono">
                    <span className="text-[10px] text-[#8F9380] uppercase">
                      {WEEKDAYS_SHORT[rem.weekday]}
                    </span>
                    <span className="text-xs font-bold text-[#38BDF8]">
                      {rem.time}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-sm font-bold text-[#D4E4FA]">
                      {rem.sportKey ? SPORT_LABELS[rem.sportKey] || rem.sportKey : 'Treino Geral'}
                    </span>
                    <span className="font-mono text-[10px] text-[#8F9380]">
                      {rem.enabled ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleReminder(rem.id, !rem.enabled)}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      rem.enabled ? 'bg-[#38BDF8]' : 'bg-[#161C24] border border-[#1F2937]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        rem.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteReminder(rem.id)}
                    className="p-1.5 text-[#8F9380] hover:text-[#FF6B35] rounded transition-colors"
                    aria-label="Excluir Lembrete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showAddModal && <TrainingReminderModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};
