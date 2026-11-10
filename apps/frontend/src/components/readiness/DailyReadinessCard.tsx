import React, { useEffect, useState, useMemo } from 'react';
import {
  HeartPulse,
  Moon,
  BatteryCharging,
  Dumbbell,
  Brain,
  Scale,
  Edit3,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { readinessApi } from '../../services/readiness.api';
import { useToast } from '../../contexts/ToastContext';
import type {
  DailyReadinessDTO,
  ReadinessStatus,
} from '@pacelog/shared';

const STATUS_META: Record<
  ReadinessStatus,
  {
    label: string;
    badge: 'green' | 'cyan' | 'amber' | 'crimson';
    color: string;
  }
> = {
  prime: {
    label: 'PICO // PRIME',
    badge: 'green',
    color: '#D4F684',
  },
  ready: {
    label: 'PRONTO PARA TREINO',
    badge: 'cyan',
    color: '#5CA9E6',
  },
  moderate: {
    label: 'ATENÇÃO // MODERADO',
    badge: 'amber',
    color: '#FFB800',
  },
  recover: {
    label: 'PRIORIZAR RECUPERAÇÃO',
    badge: 'crimson',
    color: '#FF6B35',
  },
};

const PILL_LEVELS = [1, 2, 3, 4, 5] as const;

export const DailyReadinessCard: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [todayEntry, setTodayEntry] = useState<DailyReadinessDTO | null>(null);
  const [history, setHistory] = useState<DailyReadinessDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado dos seletores rápidos (1 a 5)
  const [sleepQuality, setSleepQuality] = useState<number>(4);
  const [sleepHours, setSleepHours] = useState<string>('');
  const [muscleRecovery, setMuscleRecovery] = useState<number>(4);
  const [energyLevel, setEnergyLevel] = useState<number>(4);
  const [focusLevel, setFocusLevel] = useState<number>(4);
  const [bodyWeightKg, setBodyWeightKg] = useState<string>('');

  useEffect(() => {
    readinessApi
      .getOverview()
      .then((res) => {
        if (res?.today) {
          setTodayEntry(res.today);
          setSleepQuality(res.today.sleepQuality);
          setSleepHours(
            res.today.sleepHours != null ? String(res.today.sleepHours) : ''
          );
          setMuscleRecovery(res.today.muscleRecovery);
          setEnergyLevel(res.today.energyLevel);
          setFocusLevel(res.today.focusLevel ?? 4);
          setBodyWeightKg(
            res.today.bodyWeightKg != null ? String(res.today.bodyWeightKg) : ''
          );
        } else {
          setIsEditing(true);
        }
        if (res?.history) {
          setHistory(res.history);
        }
      })
      .catch(() => {
        setIsEditing(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Preview instantâneo do Score enquanto o usuário toca nos botões
  const previewScore = useMemo(() => {
    const weighted =
      sleepQuality * 0.35 +
      muscleRecovery * 0.3 +
      energyLevel * 0.25 +
      focusLevel * 0.1;
    return Math.max(15, Math.min(100, Math.round((weighted / 5) * 100)));
  }, [sleepQuality, muscleRecovery, energyLevel, focusLevel]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await readinessApi.saveReadiness({
        sleepQuality,
        sleepHours: sleepHours ? Number(sleepHours) : undefined,
        muscleRecovery,
        energyLevel,
        focusLevel,
        bodyWeightKg: bodyWeightKg ? Number(bodyWeightKg) : undefined,
      });
      setTodayEntry(saved);
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.dateKey !== saved.dateKey);
        return [saved, ...filtered].slice(0, 7);
      });
      setIsEditing(false);
      success(`Prontidão registrada: ${saved.readinessScore}%!`);
    } catch (err: any) {
      toastError(err?.message || 'Erro ao salvar prontidão diária.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] animate-pulse">
        <div className="h-4 w-44 bg-[#1F2937] rounded mb-3" />
        <div className="h-16 bg-[#161C24] rounded" />
      </Card>
    );
  }

  const activeStatusMeta = todayEntry
    ? STATUS_META[todayEntry.readinessStatus] || STATUS_META.ready
    : STATUS_META.ready;

  return (
    <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[#5CA9E6]/10 border border-[#5CA9E6]/30 flex items-center justify-center text-[#5CA9E6]">
            <HeartPulse className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-widest">
                Prontidão & Recuperação Diária
              </h2>
              {todayEntry && !isEditing && (
                <Badge variant={activeStatusMeta.badge} size="sm">
                  {todayEntry.readinessScore}% • {activeStatusMeta.label}
                </Badge>
              )}
            </div>
            <span className="font-mono text-[10px] text-[#8F9380]">
              Check-in fisiológico rápido (Sono, DOMS, Energia) integrado à IA
            </span>
          </div>
        </div>

        {todayEntry && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="font-mono text-[10px] uppercase tracking-wider text-[#8F9380] hover:text-[#D4E4FA] flex items-center gap-1"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Atualizar
          </button>
        )}
      </div>

      {/* Visão consolidada quando já respondeu hoje */}
      {todayEntry && !isEditing ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Score Principal */}
            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col justify-between">
              <span className="font-mono text-[9px] uppercase text-[#8F9380]">
                SCORE DO DIA
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className="font-display text-2xl font-bold"
                  style={{ color: activeStatusMeta.color }}
                >
                  {todayEntry.readinessScore}%
                </span>
              </div>
            </div>

            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col justify-between">
              <span className="font-mono text-[9px] uppercase text-[#8F9380] flex items-center gap-1">
                <Moon className="h-3 w-3 text-[#5CA9E6]" /> Sono
              </span>
              <span className="font-display text-lg font-bold text-[#D4E4FA] mt-1">
                {todayEntry.sleepQuality}/5
                {todayEntry.sleepHours ? (
                  <span className="font-mono text-[10px] text-[#8F9380] ml-1">
                    ({todayEntry.sleepHours}h)
                  </span>
                ) : null}
              </span>
            </div>

            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col justify-between">
              <span className="font-mono text-[9px] uppercase text-[#8F9380] flex items-center gap-1">
                <Dumbbell className="h-3 w-3 text-[#A855F7]" /> Músculos
              </span>
              <span className="font-display text-lg font-bold text-[#D4E4FA] mt-1">
                {todayEntry.muscleRecovery}/5
              </span>
            </div>

            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col justify-between">
              <span className="font-mono text-[9px] uppercase text-[#8F9380] flex items-center gap-1">
                <BatteryCharging className="h-3 w-3 text-[#D4F684]" /> Energia
              </span>
              <span className="font-display text-lg font-bold text-[#D4E4FA] mt-1">
                {todayEntry.energyLevel}/5
              </span>
            </div>

            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col justify-between">
              <span className="font-mono text-[9px] uppercase text-[#8F9380] flex items-center gap-1">
                <Scale className="h-3 w-3 text-[#FFB800]" /> Peso / Foco
              </span>
              <span className="font-display text-lg font-bold text-[#D4E4FA] mt-1">
                {todayEntry.bodyWeightKg
                  ? `${todayEntry.bodyWeightKg} kg`
                  : `Foco ${todayEntry.focusLevel}/5`}
              </span>
            </div>
          </div>

          {/* Recomendação Tática do Dia */}
          <div className="p-3 rounded bg-[#161C24]/90 border border-[#1F2937] flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: activeStatusMeta.color }}
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#8F9380]">
                  DIRETRIZ TÁTICA DO DIA
                </span>
                <p className="text-xs text-[#C5C8B4] leading-relaxed">
                  {todayEntry.recommendation}
                </p>
              </div>
            </div>

            {/* Mini histórico últimos 7 check-ins */}
            {history.length > 1 && (
              <div className="hidden sm:flex flex-col items-end shrink-0 gap-1">
                <span className="font-mono text-[9px] uppercase text-[#8F9380]">
                  ÚLTIMOS DIAS
                </span>
                <div className="flex items-end gap-1 h-7">
                  {[...history]
                    .reverse()
                    .slice(-7)
                    .map((h) => {
                      const heightPct = Math.max(25, h.readinessScore);
                      const barColor =
                        h.readinessScore >= 80
                          ? '#D4F684'
                          : h.readinessScore >= 65
                          ? '#5CA9E6'
                          : h.readinessScore >= 48
                          ? '#FFB800'
                          : '#FF6B35';
                      return (
                        <div
                          key={h.dateKey}
                          className="w-2 rounded-t-[1px]"
                          style={{
                            height: `${Math.round((heightPct / 100) * 28)}px`,
                            backgroundColor: barColor,
                          }}
                          title={`${h.dateKey}: ${h.readinessScore}%`}
                        />
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Formulário de Check-in Rápido (30 segundos) */
        <form onSubmit={handleSave} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Qualidade do Sono */}
            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#C5C8B4] flex items-center gap-1">
                  <Moon className="h-3 w-3 text-[#5CA9E6]" /> Qualidade do Sono
                </span>
                <span className="font-mono text-[10px] font-bold text-[#5CA9E6]">
                  {sleepQuality}/5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {PILL_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSleepQuality(lvl)}
                    className={`py-1.5 rounded font-mono text-xs font-bold border transition-colors ${
                      sleepQuality === lvl
                        ? 'bg-[#5CA9E6]/20 border-[#5CA9E6] text-[#D4E4FA]'
                        : 'bg-[#0D1C2D] border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span className="font-mono text-[9px] text-[#8F9380]">
                1 = Péssimo • 5 = Reparador
              </span>
            </div>

            {/* 2. Recuperação Muscular (DOMS) */}
            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#C5C8B4] flex items-center gap-1">
                  <Dumbbell className="h-3 w-3 text-[#A855F7]" /> Recup. Muscular
                </span>
                <span className="font-mono text-[10px] font-bold text-[#A855F7]">
                  {muscleRecovery}/5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {PILL_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setMuscleRecovery(lvl)}
                    className={`py-1.5 rounded font-mono text-xs font-bold border transition-colors ${
                      muscleRecovery === lvl
                        ? 'bg-[#A855F7]/20 border-[#A855F7] text-[#D4E4FA]'
                        : 'bg-[#0D1C2D] border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span className="font-mono text-[9px] text-[#8F9380]">
                1 = Muita dor (DOMS) • 5 = 100% Solto
              </span>
            </div>

            {/* 3. Energia Disponível */}
            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#C5C8B4] flex items-center gap-1">
                  <BatteryCharging className="h-3 w-3 text-[#D4F684]" /> Energia
                </span>
                <span className="font-mono text-[10px] font-bold text-[#D4F684]">
                  {energyLevel}/5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {PILL_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergyLevel(lvl)}
                    className={`py-1.5 rounded font-mono text-xs font-bold border transition-colors ${
                      energyLevel === lvl
                        ? 'bg-[#D4F684]/20 border-[#D4F684] text-[#D4F684]'
                        : 'bg-[#0D1C2D] border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span className="font-mono text-[9px] text-[#8F9380]">
                1 = Exausto • 5 = Disposição total
              </span>
            </div>

            {/* 4. Foco / Controle de Estresse */}
            <div className="p-3 rounded bg-[#161C24] border border-[#1F2937] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#C5C8B4] flex items-center gap-1">
                  <Brain className="h-3 w-3 text-[#FFB800]" /> Foco & Mente
                </span>
                <span className="font-mono text-[10px] font-bold text-[#FFB800]">
                  {focusLevel}/5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {PILL_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFocusLevel(lvl)}
                    className={`py-1.5 rounded font-mono text-xs font-bold border transition-colors ${
                      focusLevel === lvl
                        ? 'bg-[#FFB800]/20 border-[#FFB800] text-[#D4E4FA]'
                        : 'bg-[#0D1C2D] border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span className="font-mono text-[9px] text-[#8F9380]">
                1 = Estressado • 5 = Focado/Calmo
              </span>
            </div>
          </div>

          {/* Linha opcional de Horas de Sono + Peso Corporal + Botão Salvar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="font-mono text-[10px] uppercase text-[#8F9380]">
                  Horas de Sono (Opc):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="7.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-16 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-xs rounded px-2 py-1 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="font-mono text-[10px] uppercase text-[#8F9380]">
                  Peso kg (Opc):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  placeholder="78.5"
                  value={bodyWeightKg}
                  onChange={(e) => setBodyWeightKg(e.target.value)}
                  className="w-20 bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2 py-1 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="font-mono text-xs text-[#C5C8B4]">
                Score Previsto:{' '}
                <strong className="text-[#D4F684]">{previewScore}%</strong>
              </span>
              {todayEntry && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1.5 font-mono text-[10px] uppercase text-[#8F9380] hover:text-[#D4E4FA]"
                >
                  Cancelar
                </button>
              )}
              <Button
                type="submit"
                variant="tactile"
                size="sm"
                isLoading={isSaving}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Registrar Prontidão
              </Button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
};
