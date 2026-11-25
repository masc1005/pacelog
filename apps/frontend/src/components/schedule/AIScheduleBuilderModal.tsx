import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  ChevronRight,
  Pin,
  Moon,
  Check,
  RefreshCw,
  Calendar,
  Activity,
  Flame,
  Sun,
  Zap,
  Dumbbell,
  Waves,
  Bike,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { scheduleApi } from '../../services/schedule.api';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../hooks/useSettings';
import type {
  SportKey,
  WeeklyScheduleDTO,
  GeneratedWeeklyScheduleDTO,
  AIScheduleActivityPreference,
} from '@pacelog/shared';

interface AIScheduleBuilderModalProps {
  onScheduleApplied: (updated: WeeklyScheduleDTO) => void;
}

const WEEKDAYS = [
  { weekday: 0, short: 'SEG', full: 'Segunda-feira' },
  { weekday: 1, short: 'TER', full: 'Terça-feira' },
  { weekday: 2, short: 'QUA', full: 'Quarta-feira' },
  { weekday: 3, short: 'QUI', full: 'Quinta-feira' },
  { weekday: 4, short: 'SEX', full: 'Sexta-feira' },
  { weekday: 5, short: 'SÁB', full: 'Sábado' },
  { weekday: 6, short: 'DOM', full: 'Domingo' },
];

const SPORT_META: Record<
  SportKey,
  {
    name: string;
    color: string;
    defaultDuration: number;
    defaultSessions: number;
    icon: React.ElementType;
  }
> = {
  strength: {
    name: 'Musculação',
    color: '#A855F7',
    defaultDuration: 50,
    defaultSessions: 3,
    icon: Dumbbell,
  },
  running: {
    name: 'Corrida',
    color: '#5CA9E6',
    defaultDuration: 45,
    defaultSessions: 2,
    icon: Activity,
  },
  boxing: {
    name: 'Boxe',
    color: '#FF6B35',
    defaultDuration: 60,
    defaultSessions: 2,
    icon: Zap,
  },
  jiujitsu: {
    name: 'Jiu-Jitsu',
    color: '#E11D48',
    defaultDuration: 60,
    defaultSessions: 2,
    icon: Shield,
  },
  football: {
    name: 'Futebol',
    color: '#D4F684',
    defaultDuration: 60,
    defaultSessions: 1,
    icon: Flame,
  },
  futevolei: {
    name: 'Futevôlei',
    color: '#FFB800',
    defaultDuration: 60,
    defaultSessions: 2,
    icon: Sun,
  },
  cycling: {
    name: 'Ciclismo',
    color: '#10B981',
    defaultDuration: 60,
    defaultSessions: 2,
    icon: Bike,
  },
  swimming: {
    name: 'Natação',
    color: '#38BDF8',
    defaultDuration: 45,
    defaultSessions: 2,
    icon: Waves,
  },
};

export const AIScheduleBuilderModal: React.FC<AIScheduleBuilderModalProps> = ({
  onScheduleApplied,
}) => {
  const { success, error: toastError } = useToast();
  const { settings, userSports } = useSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<
    Record<string, AIScheduleActivityPreference>
  >({
    strength: {
      sportKey: 'strength',
      sessionsPerWeek: 3,
      fixedWeekdays: [],
      targetDurationMinutes: 50,
    },
  });
  const [restWeekdays, setRestWeekdays] = useState<number[]>([6]); // Domingo como sugestão inicial de descanso
  const [allowDoubleSessions, setAllowDoubleSessions] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedWeeklyScheduleDTO | null>(null);

  const displayedWeekdays = useMemo(() => {
    if (settings?.weekStart === 'sunday') {
      return [WEEKDAYS[6], ...WEEKDAYS.slice(0, 6)];
    }
    return WEEKDAYS;
  }, [settings?.weekStart]);

  const availableSports = useMemo(() => {
    const active = userSports.filter((s) => s.isActive && SPORT_META[s.sportKey as SportKey]);
    if (active.length === 0) {
      return (Object.keys(SPORT_META) as SportKey[]).map((key) => ({
        sportKey: key,
        name: SPORT_META[key].name,
        color: SPORT_META[key].color,
        defaultDuration: SPORT_META[key].defaultDuration,
        defaultSessions: SPORT_META[key].defaultSessions,
        icon: SPORT_META[key].icon,
      }));
    }
    return active.map((s) => {
      const key = s.sportKey as SportKey;
      const base = SPORT_META[key];
      return {
        sportKey: key,
        name: s.displayName || base.name,
        color: base.color,
        defaultDuration: base.defaultDuration,
        defaultSessions: base.defaultSessions,
        icon: base.icon,
      };
    });
  }, [userSports]);

  const toggleSportSelection = (sportKey: SportKey) => {
    setSelectedActivities((prev) => {
      const next = { ...prev };
      if (next[sportKey]) {
        delete next[sportKey];
      } else {
        const meta = SPORT_META[sportKey];
        next[sportKey] = {
          sportKey,
          sessionsPerWeek: meta?.defaultSessions ?? 2,
          fixedWeekdays: [],
          targetDurationMinutes: meta?.defaultDuration ?? 45,
        };
      }
      return next;
    });
  };

  const updateActivitySessionsCount = (sportKey: SportKey, delta: number) => {
    setSelectedActivities((prev) => {
      const curr = prev[sportKey];
      if (!curr) return prev;
      const minSessions = Math.max(1, curr.fixedWeekdays.length);
      const nextSessions = Math.min(7, Math.max(minSessions, curr.sessionsPerWeek + delta));
      return {
        ...prev,
        [sportKey]: {
          ...curr,
          sessionsPerWeek: nextSessions,
        },
      };
    });
  };

  const toggleFixedWeekday = (sportKey: SportKey, weekday: number) => {
    setSelectedActivities((prev) => {
      const curr = prev[sportKey];
      if (!curr) return prev;
      const exists = curr.fixedWeekdays.includes(weekday);
      const nextFixed = exists
        ? curr.fixedWeekdays.filter((d) => d !== weekday)
        : [...curr.fixedWeekdays, weekday];
      const nextSessions = Math.max(curr.sessionsPerWeek, nextFixed.length, 1);

      // Se fixou treino neste dia, desmarca esse dia como descanso obrigatório
      if (!exists) {
        setRestWeekdays((rPrev) => rPrev.filter((d) => d !== weekday));
      }

      return {
        ...prev,
        [sportKey]: {
          ...curr,
          fixedWeekdays: nextFixed,
          sessionsPerWeek: nextSessions,
        },
      };
    });
  };

  const updateActivityDuration = (sportKey: SportKey, minutes: number) => {
    setSelectedActivities((prev) => {
      const curr = prev[sportKey];
      if (!curr) return prev;
      return {
        ...prev,
        [sportKey]: {
          ...curr,
          targetDurationMinutes: minutes,
        },
      };
    });
  };

  const toggleRestWeekday = (weekday: number) => {
    setRestWeekdays((prev) =>
      prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday]
    );
  };

  const handleGenerate = async () => {
    const activitiesList = Object.values(selectedActivities);
    if (activitiesList.length === 0) {
      toastError('Selecione pelo menos uma atividade para a semana.');
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await scheduleApi.generateWithAI({
        activities: activitiesList,
        restWeekdays,
        allowDoubleSessions,
        notes: notes.trim() || undefined,
      });
      setGeneratedPlan(generated);
    } catch (err: any) {
      toastError(err?.message || 'Não foi possível gerar a sugestão de cronograma.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySchedule = async () => {
    if (!generatedPlan || isApplying) return;
    setIsApplying(true);
    try {
      const updated = await scheduleApi.updateSchedule({
        days: generatedPlan.days,
      });
      onScheduleApplied(updated);
      success('Cronograma semanal da IA aplicado com sucesso!');
      setIsOpen(false);
    } catch (err: any) {
      toastError(err?.message || 'Erro ao aplicar o cronograma.');
    } finally {
      setIsApplying(false);
    }
  };

  const activeList = Object.values(selectedActivities);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-3 rounded-[4px] bg-[#0D1C2D] border border-[#A855F7]/40 hover:border-[#A855F7] hover:bg-[#161C24]/80 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-[4px] bg-[#A855F7]/15 border border-[#A855F7]/40 flex items-center justify-center text-[#D4F684] shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wider truncate">
                Montar Cronograma da Semana com IA
              </span>
              <Badge variant="purple" size="sm" className="px-1.5 py-0 text-[9px] shrink-0">
                IA
              </Badge>
            </div>
            <span className="font-mono text-[10px] text-[#8F9380] truncate">
              Escolha as atividades da semana, defina dias fixos (ex: Sábado = Boxe) e deixe a IA distribuir
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#D4F684] shrink-0">
          Planejar
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-schedule-modal-title"
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setIsOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl max-h-[90dvh] flex flex-col bg-[#0D1C2D] border-t sm:border border-[#A855F7]/40 rounded-t-2xl sm:rounded-[6px] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937] bg-[#0B1521] shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#D4F684]" />
                  <h2
                    id="ai-schedule-modal-title"
                    className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wider"
                  >
                    Assistente IA — Cronograma Semanal
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar assistente de cronograma"
                  className="p-1.5 rounded text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto flex flex-col gap-5">
                {/* 1. Escolha das Modalidades da Semana */}
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4]">
                    1. Quais atividades você quer treinar na semana?
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableSports.map((sport) => {
                      const Icon = sport.icon;
                      const isSelected = Boolean(selectedActivities[sport.sportKey]);
                      return (
                        <button
                          key={sport.sportKey}
                          type="button"
                          onClick={() => toggleSportSelection(sport.sportKey)}
                          className={`p-2.5 rounded-[4px] border font-mono text-xs flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#161C24] border-[#D4F684] text-[#D4E4FA] font-bold shadow-[0_0_10px_rgba(212,246,132,0.12)]'
                              : 'bg-[#161C24]/50 border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" style={{ color: sport.color }} />
                          <span className="truncate">{sport.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Frequência e Dias Fixos por Atividade */}
                {activeList.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4]">
                        2. Frequência semanal & Dias Fixos (Ex: todo Sábado é dia de Boxe)
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {activeList.map((pref) => {
                        const sportInfo =
                          availableSports.find((s) => s.sportKey === pref.sportKey) ||
                          SPORT_META[pref.sportKey];
                        const Icon = sportInfo.icon;

                        return (
                          <div
                            key={pref.sportKey}
                            className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col gap-3"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: `${sportInfo.color}18`,
                                    border: `1px solid ${sportInfo.color}40`,
                                  }}
                                >
                                  <Icon className="h-3.5 w-3.5" style={{ color: sportInfo.color }} />
                                </div>
                                <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                                  {sportInfo.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Duração alvo */}
                                <div className="flex items-center gap-1 bg-[#0D1C2D] border border-[#1F2937] rounded px-2 py-1">
                                  <Clock className="h-3 w-3 text-[#5CA9E6]" />
                                  <select
                                    aria-label={`Duração de ${sportInfo.name}`}
                                    value={pref.targetDurationMinutes || 45}
                                    onChange={(e) =>
                                      updateActivityDuration(pref.sportKey, Number(e.target.value))
                                    }
                                    className="bg-transparent font-mono text-[11px] text-[#D4E4FA] outline-none"
                                  >
                                    {[30, 45, 50, 60, 75, 90, 120].map((m) => (
                                      <option key={m} value={m} className="bg-[#0D1C2D]">
                                        {m} min
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Controle de sessões na semana */}
                                <div className="flex items-center gap-1.5 bg-[#0D1C2D] border border-[#1F2937] rounded px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={() => updateActivitySessionsCount(pref.sportKey, -1)}
                                    className="w-5 h-5 rounded bg-[#161C24] text-[#C5C8B4] hover:text-[#D4F684] font-mono text-xs font-bold flex items-center justify-center"
                                    aria-label={`Diminuir sessões de ${sportInfo.name}`}
                                  >
                                    -
                                  </button>
                                  <span className="font-mono text-xs font-bold text-[#D4F684] min-w-[44px] text-center">
                                    {pref.sessionsPerWeek}x/sem
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateActivitySessionsCount(pref.sportKey, 1)}
                                    className="w-5 h-5 rounded bg-[#161C24] text-[#C5C8B4] hover:text-[#D4F684] font-mono text-xs font-bold flex items-center justify-center"
                                    aria-label={`Aumentar sessões de ${sportInfo.name}`}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Seletor de dias fixos para esta atividade */}
                            <div className="flex flex-col gap-1.5">
                              <span className="font-mono text-[10px] text-[#8F9380] flex items-center gap-1">
                                <Pin className="h-3 w-3 text-[#D4F684]" />
                                Fixar dias obrigatórios para {sportInfo.name} (opcional — o restante a IA distribui):
                              </span>
                              <div className="grid grid-cols-7 gap-1">
                                {displayedWeekdays.map((day) => {
                                  const isFixed = pref.fixedWeekdays.includes(day.weekday);
                                  return (
                                    <button
                                      key={day.weekday}
                                      type="button"
                                      onClick={() => toggleFixedWeekday(pref.sportKey, day.weekday)}
                                      className={`py-1.5 rounded font-mono text-[10px] uppercase border transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
                                        isFixed
                                          ? 'bg-[#D4F684]/20 border-[#D4F684] text-[#D4F684] font-bold'
                                          : 'bg-[#0D1C2D] border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA]'
                                      }`}
                                      title={
                                        isFixed
                                          ? `${sportInfo.name} fixado na ${day.full}`
                                          : `Fixar ${sportInfo.name} na ${day.full}`
                                      }
                                    >
                                      {day.short}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Dias de Descanso (Off) e Preferências */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4] flex items-center gap-1">
                      <Moon className="h-3 w-3 text-[#5CA9E6]" /> Dias de Descanso (Off) Preferidos
                    </span>
                    <div className="grid grid-cols-7 gap-1">
                      {displayedWeekdays.map((day) => {
                        const isRest = restWeekdays.includes(day.weekday);
                        return (
                          <button
                            key={day.weekday}
                            type="button"
                            onClick={() => toggleRestWeekday(day.weekday)}
                            className={`py-1.5 rounded font-mono text-[10px] uppercase border transition-colors cursor-pointer ${
                              isRest
                                ? 'bg-[#5CA9E6]/20 border-[#5CA9E6] text-[#5CA9E6] font-bold'
                                : 'bg-[#0D1C2D] border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA]'
                            }`}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4]">
                      Regras de Distribuição
                    </span>
                    <label className="flex items-center gap-2 font-mono text-xs text-[#D4E4FA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDoubleSessions}
                        onChange={(e) => setAllowDoubleSessions(e.target.checked)}
                        className="accent-[#D4F684]"
                      />
                      <span>Permitir 2 treinos no mesmo dia se necessário</span>
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Obs: Ex: evitar perna na sexta..."
                      maxLength={200}
                      className="w-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-1.5 outline-none"
                    />
                  </div>
                </div>

                {/* Botão Gerar Sugestão */}
                <Button
                  variant="secondary"
                  size="md"
                  isLoading={isGenerating}
                  disabled={activeList.length === 0 || isApplying}
                  onClick={handleGenerate}
                  leftIcon={
                    generatedPlan ? (
                      <RefreshCw className="h-4 w-4 text-[#D4F684]" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-[#D4F684]" />
                    )
                  }
                  className="w-full justify-center border-[#D4F684]/50 hover:border-[#D4F684] text-[#D4E4FA] bg-[#161C24]"
                >
                  {generatedPlan
                    ? 'Gerar Nova Distribuição com IA'
                    : 'Montar Cronograma da Semana com IA'}
                </Button>

                {/* Preview do Cronograma Gerado */}
                {generatedPlan && (
                  <div className="p-4 rounded-[4px] bg-[#161C24] border border-[#A855F7]/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#D4F684]" />
                        <h3 className="font-display text-sm font-bold text-[#D4F684] uppercase tracking-wider">
                          Sugestão de Cronograma da Semana
                        </h3>
                      </div>
                      {generatedPlan.modelUsed && (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#0D1C2D] border border-[#1F2937] text-[#8F9380]">
                          {generatedPlan.modelUsed}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded bg-[#0D1C2D] border border-[#1F2937] font-sans text-xs text-[#C5C8B4] leading-relaxed">
                      <strong className="font-mono text-[10px] uppercase text-[#A855F7] block mb-0.5">
                        Estratégia da IA:
                      </strong>
                      {generatedPlan.rationale}
                    </div>

                    {/* Lista dos 7 dias planejados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {displayedWeekdays.map((dayInfo) => {
                        const dayPlan = generatedPlan.days.find(
                          (d) => d.weekday === dayInfo.weekday
                        );
                        const workouts = dayPlan?.workouts || [];
                        const isRest = Boolean(dayPlan?.isRestDay) || workouts.length === 0;

                        return (
                          <div
                            key={dayInfo.weekday}
                            className="p-2.5 rounded bg-[#0D1C2D] border border-[#1F2937] flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-[#D4E4FA] uppercase">
                                {dayInfo.full}
                              </span>
                              {isRest ? (
                                <Badge variant="neutral" size="sm">
                                  OFF / Descanso
                                </Badge>
                              ) : (
                                <span className="font-mono text-[10px] text-[#D4F684]">
                                  {workouts.length} treino{workouts.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            {isRest ? (
                              <span className="font-mono text-[11px] text-[#8F9380] flex items-center gap-1">
                                <Moon className="h-3 w-3 text-[#5CA9E6]" /> Recuperação
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {workouts.map((w) => {
                                  const meta = SPORT_META[w.sportKey] || SPORT_META.running;
                                  const Icon = meta.icon;
                                  const isFixedHere =
                                    selectedActivities[w.sportKey]?.fixedWeekdays?.includes(
                                      dayInfo.weekday
                                    );
                                  return (
                                    <div
                                      key={w.id}
                                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#161C24] border border-[#1F2937]"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Icon
                                          className="h-3.5 w-3.5 shrink-0"
                                          style={{ color: meta.color }}
                                        />
                                        <span className="font-mono text-[11px] text-[#D4E4FA] font-semibold truncate">
                                          {w.title || meta.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {isFixedHere && (
                                          <span
                                            className="font-mono text-[9px] uppercase px-1 py-0.5 rounded bg-[#D4F684]/15 text-[#D4F684]"
                                            title="Dia fixo"
                                          >
                                            Fixo
                                          </span>
                                        )}
                                        {w.targetDurationMinutes && (
                                          <span className="font-mono text-[10px] text-[#8F9380]">
                                            {w.targetDurationMinutes}m
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        variant="tactile"
                        size="sm"
                        isLoading={isApplying}
                        onClick={handleApplySchedule}
                        leftIcon={<Check className="h-4 w-4" />}
                        className="flex-1 justify-center"
                      >
                        Aplicar Este Cronograma na Semana
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
