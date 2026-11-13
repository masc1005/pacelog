import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Trash2,
  Play,
  Moon,
  CheckCircle2,
  Clock,
  Activity,
  Flame,
  Sun,
  Zap,
  Dumbbell,
  Waves,
  Bike,
  Shield,
  Settings2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { scheduleApi } from '../../services/schedule.api';
import { strengthApi } from '../../services/strength.api';
import { useToast } from '../../contexts/ToastContext';
import { randomUUID } from '../../lib/utils';
import type {
  SportKey,
  WeeklyScheduleDTO,
  WeeklyScheduleDayPlan,
  WeeklyScheduleWorkoutItem,
  StrengthRoutineDTO,
} from '@pacelog/shared';

interface WeeklyScheduleCardProps {
  recentSessions?: any[];
  compact?: boolean;
}

/**
 * Semana começa na Segunda-feira:
 * 0 = Segunda-feira, 1 = Terça-feira, ..., 5 = Sábado, 6 = Domingo
 */
const WEEKDAYS = [
  { weekday: 0, short: 'SEG', full: 'Segunda-feira' },
  { weekday: 1, short: 'TER', full: 'Terça-feira' },
  { weekday: 2, short: 'QUA', full: 'Quarta-feira' },
  { weekday: 3, short: 'QUI', full: 'Quinta-feira' },
  { weekday: 4, short: 'SEX', full: 'Sexta-feira' },
  { weekday: 5, short: 'SÁB', full: 'Sábado' },
  { weekday: 6, short: 'DOM', full: 'Domingo' },
];

/**
 * Converte Date.getDay() do JS (0=Dom, 1=Seg, ..., 6=Sáb)
 * para índice com início na Segunda-feira (0=Seg, 1=Ter, ..., 6=Dom).
 */
function toMondayBasedWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

const SPORT_META: Record<
  SportKey,
  { name: string; color: string; badge: 'cyan' | 'green' | 'amber' | 'crimson' | 'purple' | 'blue'; icon: React.ElementType }
> = {
  running: { name: 'Corrida', color: '#5CA9E6', badge: 'cyan', icon: Activity },
  football: { name: 'Futebol', color: '#D4F684', badge: 'green', icon: Flame },
  futevolei: { name: 'Futevôlei', color: '#FFB800', badge: 'amber', icon: Sun },
  boxing: { name: 'Boxe', color: '#FF6B35', badge: 'crimson', icon: Zap },
  strength: { name: 'Musculação', color: '#A855F7', badge: 'purple', icon: Dumbbell },
  swimming: { name: 'Natação', color: '#38BDF8', badge: 'blue', icon: Waves },
  cycling: { name: 'Ciclismo', color: '#10B981', badge: 'green', icon: Bike },
  jiujitsu: { name: 'Jiu-Jitsu', color: '#E11D48', badge: 'crimson', icon: Shield },
};

export const WeeklyScheduleCard: React.FC<WeeklyScheduleCardProps> = ({
  recentSessions = [],
  compact = false,
}) => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const todayWeekday = useMemo(() => toMondayBasedWeekday(new Date()), []);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(todayWeekday);
  const [schedule, setSchedule] = useState<WeeklyScheduleDTO | null>(null);
  const [routines, setRoutines] = useState<StrengthRoutineDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado do formulário de adicionar treino ao dia
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [newSportKey, setNewSportKey] = useState<SportKey>('strength');
  const [newRoutineId, setNewRoutineId] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDuration, setNewDuration] = useState<string>('45');
  const [newTime, setNewTime] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  useEffect(() => {
    Promise.all([
      scheduleApi.getSchedule().catch(() => null),
      strengthApi.listRoutines().catch(() => []),
    ])
      .then(([schedData, routinesData]) => {
        if (schedData) setSchedule(schedData);
        if (routinesData) setRoutines(routinesData);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Verifica quais modalidades foram concluídas em cada dia da semana atual (0=Seg ... 6=Dom)
  const completedSportsByWeekday = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (let i = 0; i < 7; i++) map.set(i, new Set());

    const now = new Date();
    const mondayBasedToday = toMondayBasedWeekday(now);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - mondayBasedToday);
    startOfWeek.setHours(0, 0, 0, 0);

    for (const s of recentSessions || []) {
      if (!s?.startedAt) continue;
      const d = new Date(s.startedAt);
      if (d >= startOfWeek) {
        map.get(toMondayBasedWeekday(d))?.add(s.sportKey);
      }
    }
    return map;
  }, [recentSessions]);

  const currentDayPlan: WeeklyScheduleDayPlan = useMemo(() => {
    const found = schedule?.days?.find((d) => d.weekday === selectedWeekday);
    return (
      found ?? {
        weekday: selectedWeekday,
        isRestDay: false,
        workouts: [],
      }
    );
  }, [schedule, selectedWeekday]);

  const selectedWeekdayMeta =
    WEEKDAYS.find((w) => w.weekday === selectedWeekday) || WEEKDAYS[0];

  const handleToggleRestDay = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const nextIsRest = !currentDayPlan.isRestDay;
    try {
      const updated = await scheduleApi.updateDay({
        weekday: selectedWeekday,
        isRestDay: nextIsRest,
        workouts: nextIsRest ? [] : currentDayPlan.workouts,
      });
      setSchedule(updated);
      setIsAddingWorkout(false);
      success(
        nextIsRest
          ? `${selectedWeekdayMeta.full} marcado como Dia de Descanso (Off).`
          : `${selectedWeekdayMeta.full} reaberto para treinos.`
      );
    } catch (err: any) {
      toastError(err?.message || 'Erro ao atualizar o dia no cronograma.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddWorkoutToDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    const chosenRoutine =
      newSportKey === 'strength' && newRoutineId
        ? routines.find((r) => r.id === newRoutineId)
        : undefined;

    const item: WeeklyScheduleWorkoutItem = {
      id: randomUUID(),
      sportKey: newSportKey,
      title:
        newTitle.trim() ||
        chosenRoutine?.name ||
        SPORT_META[newSportKey]?.name ||
        'Treino',
      routineId: chosenRoutine?.id,
      routineName: chosenRoutine?.name,
      targetDurationMinutes: newDuration ? Number(newDuration) : undefined,
      plannedTime: newTime.trim() || undefined,
      notes: newNotes.trim() || undefined,
    };

    try {
      const updated = await scheduleApi.updateDay({
        weekday: selectedWeekday,
        isRestDay: false,
        workouts: [...(currentDayPlan.workouts || []), item],
      });
      setSchedule(updated);
      setIsAddingWorkout(false);
      setNewTitle('');
      setNewRoutineId('');
      setNewNotes('');
      success(`Treino adicionado na ${selectedWeekdayMeta.full}!`);
    } catch (err: any) {
      toastError(err?.message || 'Erro ao adicionar treino ao cronograma.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveWorkout = async (workoutId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const nextWorkouts = (currentDayPlan.workouts || []).filter(
        (w) => w.id !== workoutId
      );
      const updated = await scheduleApi.updateDay({
        weekday: selectedWeekday,
        isRestDay: false,
        workouts: nextWorkouts,
      });
      setSchedule(updated);
      success('Treino removido do dia.');
    } catch (err: any) {
      toastError(err?.message || 'Erro ao remover treino.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartPlannedWorkout = (workout: WeeklyScheduleWorkoutItem) => {
    if (workout.sportKey === 'strength') {
      if (workout.routineId) {
        navigate('/strength', {
          state: {
            autoStart: true,
            startedAt: new Date().toISOString(),
            routineId: workout.routineId,
          },
        });
      } else {
        navigate('/strength');
      }
      return;
    }

    navigate('/sessions/new', {
      state: {
        sportKey: workout.sportKey,
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] animate-pulse">
        <div className="h-4 w-48 bg-[#1F2937] rounded mb-4" />
        <div className="grid grid-cols-7 gap-1.5 h-16 bg-[#161C24] rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
      {/* Header do Cronograma */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[#D4F684]/10 border border-[#D4F684]/30 flex items-center justify-center text-[#D4F684]">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-widest">
              Cronograma da Semana
            </h2>
            <span className="font-mono text-[10px] text-[#8F9380]">
              Planejamento de modalidades & fichas por dia
            </span>
          </div>
        </div>

        {compact && (
          <button
            type="button"
            onClick={() => navigate('/schedule')}
            className="font-mono text-[10px] uppercase tracking-wider text-[#D4F684] hover:underline flex items-center gap-1"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Expandir
          </button>
        )}
      </div>

      {/* Barra dos 7 dias da semana */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((dayInfo) => {
          const plan = schedule?.days?.find((d) => d.weekday === dayInfo.weekday);
          const workouts = plan?.workouts || [];
          const isRest = Boolean(plan?.isRestDay);
          const isToday = dayInfo.weekday === todayWeekday;
          const isSelected = dayInfo.weekday === selectedWeekday;
          const completedSports = completedSportsByWeekday.get(dayInfo.weekday);
          const isDayCompleted =
            workouts.length > 0 &&
            workouts.every((w) => completedSports?.has(w.sportKey));

          return (
            <button
              key={dayInfo.weekday}
              type="button"
              onClick={() => {
                setSelectedWeekday(dayInfo.weekday);
                setIsAddingWorkout(false);
              }}
              className={`flex flex-col items-center justify-between p-2 rounded-[4px] border transition-all min-h-[68px] relative ${
                isSelected
                  ? 'bg-[#161C24] border-[#D4F684] shadow-[0_0_12px_rgba(212,246,132,0.12)]'
                  : isToday
                  ? 'bg-[#161C24]/80 border-[#5CA9E6]/50'
                  : 'bg-[#161C24]/40 border-[#1F2937] hover:border-[#8F9380]/50'
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`font-mono text-[10px] uppercase font-bold ${
                    isSelected
                      ? 'text-[#D4F684]'
                      : isToday
                      ? 'text-[#5CA9E6]'
                      : 'text-[#C5C8B4]'
                  }`}
                >
                  {dayInfo.short}
                </span>
                {isToday && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#5CA9E6]"
                    title="Hoje"
                  />
                )}
              </div>

              {/* Indicadores visuais dos treinos planejados no dia */}
              <div className="flex items-center justify-center gap-1 my-1 flex-wrap">
                {isRest ? (
                  <Moon className="h-3.5 w-3.5 text-[#8F9380]" />
                ) : workouts.length === 0 ? (
                  <span className="font-mono text-[9px] text-[#454839]">—</span>
                ) : (
                  workouts.slice(0, 3).map((w) => {
                    const meta = SPORT_META[w.sportKey] || SPORT_META.strength;
                    return (
                      <span
                        key={w.id}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                        title={w.title || meta.name}
                      />
                    );
                  })
                )}
              </div>

              <span className="font-mono text-[9px] text-[#8F9380] uppercase truncate max-w-full">
                {isDayCompleted ? (
                  <span className="text-[#D4F684] flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" /> OK
                  </span>
                ) : isRest ? (
                  'OFF'
                ) : workouts.length > 0 ? (
                  `${workouts.length}x`
                ) : (
                  'Livre'
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalhes do Dia Selecionado */}
      <div className="p-3.5 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wide">
              {selectedWeekdayMeta.full}
            </span>
            {selectedWeekday === todayWeekday && (
              <Badge variant="cyan" size="sm">
                Hoje
              </Badge>
            )}
            {currentDayPlan.isRestDay && (
              <Badge variant="neutral" size="sm">
                Descanso / Off
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleToggleRestDay}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase border transition-colors flex items-center gap-1 ${
                currentDayPlan.isRestDay
                  ? 'bg-[#8F9380]/20 border-[#8F9380] text-[#D4E4FA]'
                  : 'bg-[#0D1C2D] border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
              }`}
            >
              <Moon className="h-3 w-3" />
              {currentDayPlan.isRestDay ? 'Dia Off Ativo' : 'Marcar Off'}
            </button>

            {!currentDayPlan.isRestDay && !isAddingWorkout && (
              <button
                type="button"
                onClick={() => setIsAddingWorkout(true)}
                className="px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold bg-[#D4F684]/15 border border-[#D4F684]/50 text-[#D4F684] hover:bg-[#D4F684]/25 transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Adicionar Treino
              </button>
            )}
          </div>
        </div>

        {/* Estado de Dia de Descanso */}
        {currentDayPlan.isRestDay ? (
          <div className="py-4 text-center flex flex-col items-center gap-1 text-[#8F9380]">
            <Moon className="h-5 w-5 text-[#5CA9E6]" />
            <p className="font-mono text-xs text-[#C5C8B4]">
              Dia reservado para recuperação ativa ou descanso total.
            </p>
          </div>
        ) : (
          <>
            {/* Lista de treinos planejados para o dia */}
            {(currentDayPlan.workouts || []).length === 0 && !isAddingWorkout ? (
              <div className="py-4 text-center flex flex-col items-center gap-2 border border-dashed border-[#1F2937] rounded">
                <p className="font-mono text-xs text-[#8F9380]">
                  Nenhum treino planejado para {selectedWeekdayMeta.full.toLowerCase()}.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddingWorkout(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5 text-[#D4F684]" />}
                >
                  Planejar Treino neste Dia
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(currentDayPlan.workouts || []).map((workout) => {
                  const meta = SPORT_META[workout.sportKey] || SPORT_META.strength;
                  const Icon = meta.icon;
                  const isDoneThisWeek = completedSportsByWeekday
                    .get(selectedWeekday)
                    ?.has(workout.sportKey);

                  return (
                    <div
                      key={workout.id}
                      className="p-3 rounded bg-[#0D1C2D] border border-[#1F2937] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${meta.color}18`,
                            border: `1px solid ${meta.color}40`,
                          }}
                        >
                          <Icon className="h-4 w-4" style={{ color: meta.color }} />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#D4E4FA] truncate">
                              {workout.title || meta.name}
                            </span>
                            <Badge variant={meta.badge} size="sm">
                              {meta.name}
                            </Badge>
                            {isDoneThisWeek && (
                              <Badge variant="green" size="sm">
                                Concluído
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[10px] text-[#8F9380] mt-0.5 flex-wrap">
                            {workout.routineName && (
                              <span className="text-[#A855F7]">
                                Ficha: {workout.routineName}
                              </span>
                            )}
                            {workout.targetDurationMinutes && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {workout.targetDurationMinutes} min
                              </span>
                            )}
                            {workout.plannedTime && (
                              <span>às {workout.plannedTime}</span>
                            )}
                            {workout.notes && (
                              <span className="italic text-[#C5C8B4]">
                                • {workout.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartPlannedWorkout(workout)}
                          className="px-2.5 py-1.5 rounded bg-[#D4F684] text-[#051424] hover:bg-[#c8f060] font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          title="Iniciar este treino agora"
                        >
                          <Play className="h-3 w-3" />
                          Treinar
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleRemoveWorkout(workout.id)}
                          className="p-1.5 text-[#8F9380] hover:text-[#FFB4AB] rounded transition-colors"
                          title="Remover do dia"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulário inline para adicionar treino ao dia */}
            {isAddingWorkout && (
              <form
                onSubmit={handleAddWorkoutToDay}
                className="p-3.5 rounded bg-[#0D1C2D] border border-[#D4F684]/40 flex flex-col gap-3 mt-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4F684] font-bold">
                    Novo Treino na {selectedWeekdayMeta.full}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingWorkout(false)}
                    className="font-mono text-[10px] text-[#8F9380] hover:text-[#D4E4FA]"
                  >
                    Cancelar
                  </button>
                </div>

                {/* Escolha da modalidade */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(Object.keys(SPORT_META) as SportKey[]).map((key) => {
                    const m = SPORT_META[key];
                    const Icon = m.icon;
                    const active = newSportKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewSportKey(key)}
                        className={`p-2 rounded border font-mono text-[11px] flex items-center gap-2 transition-colors ${
                          active
                            ? 'bg-[#161C24] border-[#D4F684] text-[#D4E4FA] font-bold'
                            : 'bg-[#161C24]/50 border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: m.color }} />
                        <span className="truncate">{m.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Se for Musculação e tiver fichas salvas, permite vincular uma ficha */}
                {newSportKey === 'strength' && routines.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] uppercase text-[#C5C8B4]">
                      Vincular Ficha de Musculação (Opcional)
                    </label>
                    <select
                      value={newRoutineId}
                      onChange={(e) => setNewRoutineId(e.target.value)}
                      className="w-full bg-[#161C24] border border-[#1F2937] focus:border-[#A855F7] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-2 outline-none"
                    >
                      <option value="">Treino Livre / Escolher na hora</option>
                      {routines.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.exercises.length} exercícios)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase text-[#C5C8B4]">
                      Título / Foco (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ex: Treino A, Tiros 5km, Sparring..."
                      maxLength={80}
                      className="w-full bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-1.5 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] uppercase text-[#C5C8B4]">
                      Duração Alvo (min)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={360}
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="w-full bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-1.5 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] uppercase text-[#C5C8B4]">
                      Horário (Opcional)
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-1.5 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="submit"
                    variant="tactile"
                    size="sm"
                    isLoading={isSaving}
                  >
                    Salvar no Cronograma
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
