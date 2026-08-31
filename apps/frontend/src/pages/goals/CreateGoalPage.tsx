import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiClient, ApiError } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSyncQueue } from '../../pwa/hooks/useSyncQueue';
import {
  SPORT_KEYS,
  type SportKey,
  type GoalMetricType,
  type GoalPeriod,
  type GoalScope,
} from '@pacelog/shared';
import {
  Activity,
  Zap,
  Sun,
  Dumbbell,
  Flame,
  Plus,
  Waves,
  Bike,
  Shield,
  Layers,
  ArrowLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap },
  jiujitsu: { name: 'Jiu-Jitsu', color: '#E11D48', icon: Shield },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell },
  swimming: { name: 'Natação', color: '#38BDF8', icon: Waves },
  cycling: { name: 'Ciclismo', color: '#10B981', icon: Bike },
};

// Definição de métricas disponíveis por modalidade
interface MetricOption {
  value: GoalMetricType;
  label: string;
  unit: string;
  placeholder: string;
  defaultTarget: number;
}

const METRICS_MAP: Record<string, MetricOption[]> = {
  running: [
    { value: 'distance_km', label: 'Distância Total', unit: 'km', placeholder: 'Ex: 30', defaultTarget: 30 },
    { value: 'average_pace_seconds_per_km', label: 'Melhorar Ritmo (Pace)', unit: 'min/km', placeholder: 'Ex: 5:00', defaultTarget: 300 },
    { value: 'sessions_count', label: 'Frequência de Treinos', unit: 'sessões', placeholder: 'Ex: 4', defaultTarget: 4 },
    { value: 'duration_minutes', label: 'Tempo em Movimento', unit: 'min', placeholder: 'Ex: 180', defaultTarget: 180 },
    { value: 'streak_days', label: 'Consistência (Dias)', unit: 'dias', placeholder: 'Ex: 14', defaultTarget: 14 },
  ],
  cycling: [
    { value: 'distance_km', label: 'Distância Total', unit: 'km', placeholder: 'Ex: 80', defaultTarget: 80 },
    { value: 'average_speed_kmh', label: 'Velocidade Média', unit: 'km/h', placeholder: 'Ex: 28', defaultTarget: 28 },
    { value: 'sessions_count', label: 'Frequência de Pedal', unit: 'sessões', placeholder: 'Ex: 3', defaultTarget: 3 },
    { value: 'duration_minutes', label: 'Tempo Total', unit: 'min', placeholder: 'Ex: 240', defaultTarget: 240 },
    { value: 'streak_days', label: 'Consistência (Dias)', unit: 'dias', placeholder: 'Ex: 10', defaultTarget: 10 },
  ],
  swimming: [
    { value: 'distance_km', label: 'Distância em Nado', unit: 'km', placeholder: 'Ex: 10', defaultTarget: 10 },
    { value: 'sessions_count', label: 'Frequência na Piscina', unit: 'sessões', placeholder: 'Ex: 3', defaultTarget: 3 },
    { value: 'duration_minutes', label: 'Tempo de Água', unit: 'min', placeholder: 'Ex: 120', defaultTarget: 120 },
  ],
  strength: [
    { value: 'volume_kg', label: 'Volume Total Levantado', unit: 'kg', placeholder: 'Ex: 15000', defaultTarget: 15000 },
    { value: 'weight_kg', label: 'Carga Máxima (1RM)', unit: 'kg', placeholder: 'Ex: 100', defaultTarget: 100 },
    { value: 'sessions_count', label: 'Frequência de Força', unit: 'sessões', placeholder: 'Ex: 4', defaultTarget: 4 },
    { value: 'duration_minutes', label: 'Tempo de Treino', unit: 'min', placeholder: 'Ex: 200', defaultTarget: 200 },
  ],
  boxing: [
    { value: 'rounds_count', label: 'Contagem de Rounds', unit: 'rounds', placeholder: 'Ex: 30', defaultTarget: 30 },
    { value: 'sessions_count', label: 'Frequência de Boxe', unit: 'sessões', placeholder: 'Ex: 3', defaultTarget: 3 },
    { value: 'duration_minutes', label: 'Tempo no Ringue', unit: 'min', placeholder: 'Ex: 150', defaultTarget: 150 },
  ],
  jiujitsu: [
    { value: 'rounds_count', label: 'Rolas / Rounds', unit: 'rolas', placeholder: 'Ex: 20', defaultTarget: 20 },
    { value: 'sessions_count', label: 'Frequência no Tatame', unit: 'sessões', placeholder: 'Ex: 4', defaultTarget: 4 },
    { value: 'duration_minutes', label: 'Tempo de Treino', unit: 'min', placeholder: 'Ex: 240', defaultTarget: 240 },
  ],
  football: [
    { value: 'sessions_count', label: 'Partidas / Treinos', unit: 'jogos', placeholder: 'Ex: 2', defaultTarget: 2 },
    { value: 'duration_minutes', label: 'Tempo de Jogo', unit: 'min', placeholder: 'Ex: 120', defaultTarget: 120 },
  ],
  futevolei: [
    { value: 'rounds_count', label: 'Sets Jogados', unit: 'sets', placeholder: 'Ex: 12', defaultTarget: 12 },
    { value: 'sessions_count', label: 'Frequência na Areia', unit: 'sessões', placeholder: 'Ex: 3', defaultTarget: 3 },
    { value: 'duration_minutes', label: 'Tempo de Areia', unit: 'min', placeholder: 'Ex: 120', defaultTarget: 120 },
  ],
  overall: [
    { value: 'sessions_count', label: 'Frequência Geral', unit: 'sessões', placeholder: 'Ex: 5', defaultTarget: 5 },
    { value: 'duration_minutes', label: 'Volume Geral de Tempo', unit: 'min', placeholder: 'Ex: 300', defaultTarget: 300 },
    { value: 'streak_days', label: 'Consistência (Dias Consecutivos)', unit: 'dias', placeholder: 'Ex: 21', defaultTarget: 21 },
  ],
};

const PERIODS: Array<{ value: GoalPeriod; label: string }> = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'custom', label: 'Personalizado' },
];

export const CreateGoalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { enqueue } = useSyncQueue();

  // Form State
  const [scope, setScope] = useState<GoalScope>('sport');
  const [sportKey, setSportKey] = useState<SportKey | ''>('running');
  const [metricType, setMetricType] = useState<GoalMetricType>('distance_km');
  const [targetValue, setTargetValue] = useState<string>('30');
  const [paceMin, setPaceMin] = useState<number>(5);
  const [paceSec, setPaceSec] = useState<number>(0);
  const [period, setPeriod] = useState<GoalPeriod>('weekly');
  const [deadline, setDeadline] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Lista de métricas disponíveis para a combinação atual
  const availableMetrics = useMemo(() => {
    if (scope === 'overall' || !sportKey) {
      return METRICS_MAP.overall;
    }
    return METRICS_MAP[sportKey] || METRICS_MAP.overall;
  }, [scope, sportKey]);

  // Seletor de modalidade altera métrica para a primeira disponível
  const handleSportSelect = (key: SportKey | '') => {
    if (key === '') {
      setScope('overall');
      setSportKey('');
      const defaultMetric = METRICS_MAP.overall[0];
      setMetricType(defaultMetric.value);
      setTargetValue(String(defaultMetric.defaultTarget));
    } else {
      setScope('sport');
      setSportKey(key);
      const metrics = METRICS_MAP[key] || METRICS_MAP.overall;
      const defaultMetric = metrics[0];
      setMetricType(defaultMetric.value);
      setTargetValue(String(defaultMetric.defaultTarget));
    }
  };

  const selectedMetricOption = useMemo(() => {
    return availableMetrics.find((m) => m.value === metricType) || availableMetrics[0];
  }, [availableMetrics, metricType]);

  const isPaceMetric = metricType === 'average_pace_seconds_per_km';

  // Título gerado dinamicamente para preview
  const previewTitle = useMemo(() => {
    if (customTitle.trim()) return customTitle.trim();
    const sportName = sportKey ? sportMeta[sportKey].name : 'Geral';
    if (isPaceMetric) {
      return `${sportName} · Pace ${paceMin}:${paceSec.toString().padStart(2, '0')}/km`;
    }
    return `${sportName} · ${targetValue || '0'} ${selectedMetricOption.unit}`;
  }, [customTitle, sportKey, isPaceMetric, paceMin, paceSec, targetValue, selectedMetricOption]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalTarget = Number(targetValue);
    if (isPaceMetric) {
      finalTarget = paceMin * 60 + paceSec;
    }

    if (isNaN(finalTarget) || finalTarget <= 0) {
      addToast('Informe um valor alvo válido e positivo.', 'error');
      return;
    }

    setIsLoading(true);
    const clientUuid = crypto.randomUUID();

    const payload = {
      clientUuid,
      title: previewTitle,
      scope,
      sportKey: scope === 'sport' && sportKey ? sportKey : null,
      metricType,
      direction: isPaceMetric ? ('decrease' as const) : ('increase' as const),
      targetValue: finalTarget,
      unit: selectedMetricOption.unit,
      period,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      notes: notes.trim() || null,
    };

    try {
      await apiClient('/api/goals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      addToast('Meta tática criada com sucesso!', 'success');
      navigate('/goals');
    } catch (networkErr) {
      const isNetworkError = networkErr instanceof ApiError && networkErr.status === 0;

      if (isNetworkError && user) {
        // Enfileirar offline
        await enqueue('create_goal' as any, payload as any, {
          clientUuid,
          entityTable: 'goals',
          apiEndpoint: '/api/goals',
          method: 'POST',
        });
        addToast('Meta salva offline. Sincronizando quando a conexão voltar.', 'info');
        navigate('/goals');
      } else {
        addToast('Erro ao criar meta. Verifique os dados e tente novamente.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Nova Meta
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Defina seu próximo marco tático de desempenho
          </p>
        </div>
        <Link to="/goals">
          <Badge variant="neutral" size="sm" className="cursor-pointer hover:opacity-80 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Cancelar
          </Badge>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 1. Seleção de Modalidade / Escopo */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider font-bold">
            1. Modalidade Esportiva
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => handleSportSelect('')}
              className={`p-2.5 rounded-[4px] font-mono text-xs uppercase font-bold border flex flex-col items-center gap-1.5 transition-all ${
                scope === 'overall'
                  ? 'bg-[#D4F684] text-[#051424] border-[#D4F684] shadow-[0_0_15px_rgba(212,246,132,0.2)]'
                  : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:border-[#454839]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Geral</span>
            </button>

            {SPORT_KEYS.map((key) => {
              const meta = sportMeta[key];
              const Icon = meta.icon;
              const isSelected = scope === 'sport' && sportKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSportSelect(key)}
                  className={`p-2.5 rounded-[4px] font-mono text-xs uppercase font-bold border flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-[#161C24] text-[#D4E4FA] border-[#D4F684] shadow-[0_0_15px_rgba(212,246,132,0.2)]'
                      : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:border-[#454839]'
                  }`}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: isSelected ? meta.color : undefined }}
                  />
                  <span>{meta.name}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 2. Seleção de Métrica Compatível */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider font-bold">
            2. Métrica de Desempenho
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableMetrics.map((opt) => {
              const isSelected = metricType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setMetricType(opt.value);
                    if (opt.value !== 'average_pace_seconds_per_km') {
                      setTargetValue(String(opt.defaultTarget));
                    }
                  }}
                  className={`p-3 rounded-[4px] font-mono text-xs text-left border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#5CA9E6]/10 border-[#5CA9E6] text-[#D4E4FA] shadow-[0_0_15px_rgba(92,169,230,0.15)]'
                      : 'bg-[#161C24] border-[#1F2937] text-[#8F9380] hover:border-[#454839]'
                  }`}
                >
                  <span className="font-bold">{opt.label}</span>
                  <Badge variant={isSelected ? 'cyan' : 'neutral'} size="sm">
                    {opt.unit}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 3. Valor Alvo e Período */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
          <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider font-bold">
            3. Alvo e Janela Temporal
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Valor Alvo */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-[#8F9380]">
                Alvo Desejado ({selectedMetricOption.unit})
              </label>

              {isPaceMetric ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={paceMin}
                      onChange={(e) => setPaceMin(Math.max(2, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-center text-sm rounded-[4px]"
                      placeholder="Min"
                    />
                  </div>
                  <span className="font-mono text-[#8F9380] font-bold">:</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={paceSec}
                      onChange={(e) => setPaceSec(Math.min(59, Math.max(0, Number(e.target.value))))}
                      className="w-full px-3 py-2 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-center text-sm rounded-[4px]"
                      placeholder="Seg"
                    />
                  </div>
                  <span className="font-mono text-xs text-[#8F9380]">/km</span>
                </div>
              ) : (
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={selectedMetricOption.placeholder}
                  className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none"
                  required
                />
              )}
            </div>

            {/* Período */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-[#8F9380]">
                Período de Avaliação
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
                className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prazo Limite Opcional */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="font-mono text-xs text-[#8F9380] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
              Data Limite / Prazo Final <span className="text-[#454839]">(opcional)</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none"
            />
          </div>
        </Card>

        {/* 4. Resumo e Personalização */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4F684]" />
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider font-bold">
              4. Resumo Tático
            </label>
          </div>

          {/* Box de Preview da Meta */}
          <div className="bg-[#161C24] p-4 rounded-[4px] border border-[#1F2937] flex flex-col gap-2">
            <span className="font-display text-base font-bold text-[#D4E4FA]">
              {previewTitle}
            </span>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[#8F9380]">
              <span>Alvo: {isPaceMetric ? `${paceMin}:${paceSec.toString().padStart(2, '0')}/km` : `${targetValue} ${selectedMetricOption.unit}`}</span>
              <span>•</span>
              <span>Janela: {period === 'weekly' ? 'Semanal' : period === 'monthly' ? 'Mensal' : 'Personalizada'}</span>
              {deadline && (
                <>
                  <span>•</span>
                  <span className="text-[#38BDF8]">Prazo: {new Date(deadline).toLocaleDateString('pt-BR')}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#8F9380]">
              Título Personalizado <span className="text-[#454839]">(opcional)</span>
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={previewTitle}
              className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#8F9380]">
              Estratégia / Notas <span className="text-[#454839]">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Treinar 3x por semana focado em subidas..."
              className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none resize-none"
            />
          </div>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          variant="tactile"
          size="lg"
          isLoading={isLoading}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full font-mono text-sm uppercase tracking-widest py-3.5 mt-2"
        >
          Criar Meta Tática
        </Button>
      </form>
    </div>
  );
};
