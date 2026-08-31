import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { SPORT_KEYS, type SportKey, type SessionDTO } from '@pacelog/shared';
import { apiClient } from '../../lib/api';
import { Activity, Zap, Sun, Dumbbell, Flame, CheckCircle, ChevronRight, ChevronLeft, ChevronDown, AlertTriangle, Waves, Bike, Shield } from 'lucide-react';
import { ShoePicker } from '../../components/shoes/ShoePicker';
import { toLocalInputDateTime } from '../../lib/utils';
import { RpeSelector } from '../../components/ui/RpeSelector';

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

export const EditSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [sportKey, setSportKey] = useState<SportKey>('running');
  const [startedAt, setStartedAt] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [rpe, setRpe] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [shoeId, setShoeId] = useState<string | null>(null);
  
  // Dynamic metrics state
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const data = await apiClient<SessionDTO>(`/api/sessions/${id}`);
        setSportKey(data.sportKey as SportKey);
        
        // Formatar startedAt para input datetime-local no fuso local (YYYY-MM-DDTHH:mm)
        setStartedAt(toLocalInputDateTime(data.startedAt));
        
        setDurationMinutes(Math.round(data.durationSeconds / 60));
        setRpe(data.rpe);
        setNotes(data.notes || '');
        setShoeId((data as any).shoeId || null);
        setMetrics(data.metrics || {});
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar sessão.');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [id]);

  const handleNext = () => {
    if (step === 1) {
      if (!sportKey || !startedAt || durationMinutes <= 0) {
        alert('Preencha os campos obrigatórios do Passo 1.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalMetrics = { ...metrics };
      if (sportKey === 'cycling') {
        const dist = Number(metrics.distanceKm || 0);
        const durMin = Number(durationMinutes || 0);
        if (dist > 0 && durMin > 0) {
          finalMetrics.avgSpeedKmh = Number((dist / (durMin / 60)).toFixed(1));
        }
      }

      const payload = {
        sportKey,
        startedAt: new Date(startedAt).toISOString(),
        durationSeconds: durationMinutes * 60,
        rpe,
        sessionalLoad: rpe * durationMinutes,
        status: 'completed',
        metrics: finalMetrics,
        notes,
        shoeId: sportKey === 'running' ? shoeId : null,
      };

      await apiClient<SessionDTO>(`/api/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      navigate(`/sessions/${id}`);
    } catch (err: any) {
      alert('Erro ao atualizar sessão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4F684]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle className="h-10 w-10 text-[#FF6B35]" />
        <p className="font-mono text-sm text-[#8F9380] uppercase">{error}</p>
        <button onClick={() => navigate(-1)} className="text-[#5CA9E6] font-mono text-xs hover:underline">
          Voltar
        </button>
      </div>
    );
  }

  const CurrentSportIcon = sportMeta[sportKey].icon;

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Editar Telemetria
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Passo {step} de 3 — {step === 1 ? 'Fundação' : step === 2 ? 'Métricas de Campo' : 'Carga de Esforço'}
          </p>
        </div>
        <Badge variant="purple">EDIÇÃO</Badge>
      </div>

      {/* STEP 1: Foundation */}
      {step === 1 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="select-edit-sport-key" className="block font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
                Modalidade
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none flex items-center justify-center">
                  <CurrentSportIcon className="h-5 w-5" style={{ color: sportMeta[sportKey].color }} />
                </div>
                <select
                  id="select-edit-sport-key"
                  value={sportKey}
                  onChange={(e) => setSportKey(e.target.value as SportKey)}
                  className="w-full pl-11 pr-10 py-3 bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none transition-colors appearance-none cursor-pointer hover:border-[#454839]"
                >
                  {SPORT_KEYS.map((key) => (
                    <option key={key} value={key} className="bg-[#0D1C2D] text-[#D4E4FA] py-2">
                      {sportMeta[key].name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 pointer-events-none text-[#8F9380]">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="border-t border-[#1F2937] pt-4 flex flex-col gap-4">
              <label className="block font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
                Parâmetros Básicos
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Data e Hora"
                  type="datetime-local"
                  value={startedAt}
                  onChange={e => setStartedAt(e.target.value)}
                />
                <Input
                  label="Duração (minutos)"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 2: Dynamic Metrics */}
      {step === 2 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              {React.createElement(sportMeta[sportKey as SportKey].icon, { className: "h-5 w-5", style: { color: sportMeta[sportKey as SportKey].color } })}
              <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
                Métricas Específicas: {sportMeta[sportKey as SportKey].name}
              </label>
            </div>

            {sportKey === 'running' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input
                  label="Distância (km)"
                  type="number"
                  step="0.01"
                  value={metrics.distanceKm || ''}
                  onChange={e => setMetrics({...metrics, distanceKm: Number(e.target.value)})}
                />
                <div className="flex gap-2">
                  <Input
                    label="Pace (Min)"
                    type="number"
                    value={metrics.paceMin || ''}
                    onChange={e => setMetrics({...metrics, paceMin: Number(e.target.value)})}
                  />
                  <Input
                    label="Pace (Seg)"
                    type="number"
                    value={metrics.paceSec || ''}
                    onChange={e => setMetrics({...metrics, paceSec: Number(e.target.value)})}
                  />
                </div>
                <Input
                  label="Elevação (m)"
                  type="number"
                  value={metrics.elevationGainMeters || ''}
                  onChange={e => setMetrics({...metrics, elevationGainMeters: Number(e.target.value)})}
                />
                <Input
                  label="FC Média (bpm)"
                  type="number"
                  value={metrics.avgHeartRate || ''}
                  onChange={e => setMetrics({...metrics, avgHeartRate: Number(e.target.value)})}
                />
                <Input
                  label="FC Máx (bpm)"
                  type="number"
                  value={metrics.maxHeartRate || ''}
                  onChange={e => setMetrics({...metrics, maxHeartRate: Number(e.target.value)})}
                />
                <Input
                  label="Cadência Média"
                  type="number"
                  value={metrics.cadenceAvg || ''}
                  onChange={e => setMetrics({...metrics, cadenceAvg: Number(e.target.value)})}
                />
                
                <ShoePicker 
                  value={metrics.shoeId}
                  onChange={shoeId => setMetrics({...metrics, shoeId})}
                />
              </div>
            )}

            {sportKey === 'swimming' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Ambiente
                  </label>
                  <select
                    className="input-precision py-2 text-sm"
                    value={metrics.environment || 'pool'}
                    onChange={e => setMetrics({...metrics, environment: e.target.value})}
                  >
                    <option value="pool">Piscina</option>
                    <option value="open_water">Águas Abertas</option>
                  </select>
                </div>
                <Input
                  label="Distância (m)"
                  type="number"
                  min={0}
                  value={metrics.totalDistanceMeters || ''}
                  onChange={e => setMetrics({...metrics, totalDistanceMeters: Number(e.target.value)})}
                />
                <Input
                  label="Pace (s/100m)"
                  type="number"
                  min={0}
                  value={metrics.paceSecondsPer100m || ''}
                  onChange={e => setMetrics({...metrics, paceSecondsPer100m: Number(e.target.value)})}
                />
                {metrics.environment !== 'open_water' && (
                  <Input
                    label="Tamanho da Piscina (m)"
                    type="number"
                    min={0}
                    value={metrics.poolLengthMeters || ''}
                    onChange={e => setMetrics({...metrics, poolLengthMeters: Number(e.target.value)})}
                  />
                )}
                {metrics.environment !== 'open_water' && (
                  <Input
                    label="Qtd. Piscinas"
                    type="number"
                    min={0}
                    value={metrics.totalLaps || ''}
                    onChange={e => setMetrics({...metrics, totalLaps: Number(e.target.value)})}
                  />
                )}
                <Input
                  label="FC Média (bpm)"
                  type="number"
                  min={30}
                  max={250}
                  value={metrics.averageHeartRate || ''}
                  onChange={e => setMetrics({...metrics, averageHeartRate: Number(e.target.value)})}
                />
                <Input
                  label="SWOLF"
                  type="number"
                  min={0}
                  value={metrics.swolf || ''}
                  onChange={e => setMetrics({...metrics, swolf: Number(e.target.value)})}
                />
              </div>
            )}

            {sportKey === 'cycling' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Tipo de Pedal
                  </label>
                  <select
                    className="input-precision py-2 text-sm bg-[#0D1C2D] border border-[#1F2937] text-[#D4E4FA] rounded px-3"
                    value={metrics.cyclingType || 'road'}
                    onChange={e => setMetrics({...metrics, cyclingType: e.target.value})}
                  >
                    <option value="road">Rua / Asfalto</option>
                    <option value="indoor">Indoor / Spinning</option>
                    <option value="mountain_bike">Mountain Bike (MTB)</option>
                    <option value="mixed">Misto</option>
                  </select>
                </div>
                <Input
                  label="Duração da Atividade (min)"
                  type="number"
                  min={1}
                  value={durationMinutes || ''}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                />
                <Input
                  label="Distância (km)"
                  type="number"
                  step="0.1"
                  min={0.1}
                  value={metrics.distanceKm || ''}
                  onChange={e => setMetrics({...metrics, distanceKm: Number(e.target.value)})}
                />
                
                {/* Live Speed Preview */}
                <div className="flex flex-col gap-1 p-3 bg-[#161C24] border border-[#10B981]/40 rounded justify-center col-span-2 sm:col-span-1">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Velocidade Média Prevista</span>
                  <span className="font-display text-lg font-bold text-[#10B981]">
                    {metrics.distanceKm && durationMinutes > 0
                      ? `${((metrics.distanceKm / (durationMinutes / 60))).toFixed(1)} km/h`
                      : '-- km/h'}
                  </span>
                </div>

                {metrics.cyclingType !== 'indoor' && (
                  <Input
                    label="Ganho de Elevação (m)"
                    type="number"
                    min={0}
                    value={metrics.elevationGainMeters || ''}
                    onChange={e => setMetrics({...metrics, elevationGainMeters: Number(e.target.value)})}
                  />
                )}
                <Input
                  label="FC Média (bpm)"
                  type="number"
                  min={30}
                  max={250}
                  value={metrics.averageHeartRate || ''}
                  onChange={e => setMetrics({...metrics, averageHeartRate: Number(e.target.value)})}
                />
                <Input
                  label="FC Máx (bpm)"
                  type="number"
                  min={30}
                  max={250}
                  value={metrics.maxHeartRate || ''}
                  onChange={e => setMetrics({...metrics, maxHeartRate: Number(e.target.value)})}
                />
              </div>
            )}

            {sportKey === 'jiujitsu' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Tipo de Treino
                  </label>
                  <select
                    className="input-precision py-2 text-sm bg-[#0D1C2D] border border-[#1F2937] text-[#D4E4FA] rounded px-3"
                    value={metrics.trainingType || 'technique'}
                    onChange={e => setMetrics({...metrics, trainingType: e.target.value})}
                  >
                    <option value="technique">Técnica</option>
                    <option value="sparring">Sparring (Rolas)</option>
                    <option value="competition">Competição</option>
                    <option value="drilling">Drilling</option>
                    <option value="seminar">Seminário</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Estilo / Vestimenta
                  </label>
                  <select
                    className="input-precision py-2 text-sm bg-[#0D1C2D] border border-[#1F2937] text-[#D4E4FA] rounded px-3"
                    value={metrics.gi === false ? 'no_gi' : 'gi'}
                    onChange={e => setMetrics({...metrics, gi: e.target.value === 'gi'})}
                  >
                    <option value="gi">Com Kimono (Gi)</option>
                    <option value="no_gi">Sem Kimono (No-Gi)</option>
                  </select>
                </div>

                <Input
                  label="Duração no Tatame (min)"
                  type="number"
                  min={1}
                  value={durationMinutes || ''}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                />

                {(metrics.trainingType === 'sparring' || metrics.trainingType === 'competition') && (
                  <>
                    <Input
                      label="Qtd. de Rolas"
                      type="number"
                      min={0}
                      value={metrics.roundsCount || ''}
                      onChange={e => setMetrics({...metrics, roundsCount: Number(e.target.value)})}
                    />
                    <Input
                      label="Duração Média por Rola (min)"
                      type="number"
                      min={1}
                      value={metrics.averageRoundDurationSeconds ? Math.round(metrics.averageRoundDurationSeconds / 60) : ''}
                      onChange={e => setMetrics({...metrics, averageRoundDurationSeconds: Number(e.target.value) * 60})}
                    />
                    <Input
                      label="Finalizações Aplicadas"
                      type="number"
                      min={0}
                      value={metrics.submissionsLanded ?? ''}
                      onChange={e => setMetrics({...metrics, submissionsLanded: Number(e.target.value)})}
                    />
                    <Input
                      label="Finalizações Sofridas"
                      type="number"
                      min={0}
                      value={metrics.submissionsReceived ?? ''}
                      onChange={e => setMetrics({...metrics, submissionsReceived: Number(e.target.value)})}
                    />
                  </>
                )}

                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Faixa
                  </label>
                  <select
                    className="input-precision py-2 text-sm bg-[#0D1C2D] border border-[#1F2937] text-[#D4E4FA] rounded px-3"
                    value={metrics.beltRank || 'white'}
                    onChange={e => setMetrics({...metrics, beltRank: e.target.value})}
                  >
                    <option value="white">Faixa Branca</option>
                    <option value="blue">Faixa Azul</option>
                    <option value="purple">Faixa Roxa</option>
                    <option value="brown">Faixa Marrom</option>
                    <option value="black">Faixa Preta</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Grau na Faixa
                  </label>
                  <select
                    className="input-precision py-2 text-sm bg-[#0D1C2D] border border-[#1F2937] text-[#D4E4FA] rounded px-3"
                    value={metrics.beltDegree ?? 0}
                    onChange={e => setMetrics({...metrics, beltDegree: Number(e.target.value)})}
                  >
                    <option value="0">0º Grau</option>
                    <option value="1">1º Grau</option>
                    <option value="2">2º Grau</option>
                    <option value="3">3º Grau</option>
                    <option value="4">4º Grau</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <Input
                    label="Foco Técnico / Posições"
                    type="text"
                    value={Array.isArray(metrics.techniquesFocus) ? metrics.techniquesFocus.join(', ') : (metrics.techniquesFocus || '')}
                    onChange={e => setMetrics({...metrics, techniquesFocus: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)})}
                  />
                </div>
              </div>
            )}

            {sportKey === 'boxing' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Qtd. Rounds"
                  type="number"
                  value={metrics.roundsCount || ''}
                  onChange={e => setMetrics({...metrics, roundsCount: Number(e.target.value)})}
                />
                <Input
                  label="Round (s)"
                  type="number"
                  value={metrics.roundDurationSeconds || ''}
                  onChange={e => setMetrics({...metrics, roundDurationSeconds: Number(e.target.value)})}
                />
                <Input
                  label="Descanso (s)"
                  type="number"
                  value={metrics.restDurationSeconds || ''}
                  onChange={e => setMetrics({...metrics, restDurationSeconds: Number(e.target.value)})}
                />
                <Input
                  label="Golpes Estimados"
                  type="number"
                  value={metrics.punchesThrownEstimate || ''}
                  onChange={e => setMetrics({...metrics, punchesThrownEstimate: Number(e.target.value)})}
                />
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Foco do Treino
                  </label>
                  <select
                    className="input-precision py-2 text-sm"
                    value={metrics.focusArea || ''}
                    onChange={e => setMetrics({...metrics, focusArea: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="bag_work">Saco de Pancadas</option>
                    <option value="sparring">Sparring</option>
                    <option value="pad_work">Manopla</option>
                    <option value="technique">Técnica</option>
                    <option value="conditioning">Condicionamento</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Teve Sparring?
                  </label>
                  <select
                    className="input-precision py-2 text-sm"
                    value={metrics.sparring ? 'true' : 'false'}
                    onChange={e => setMetrics({...metrics, sparring: e.target.value === 'true'})}
                  >
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </div>
              </div>
            )}

            {sportKey === 'strength' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input
                  label="Total de Séries"
                  type="number"
                  value={metrics.totalSets || ''}
                  onChange={e => setMetrics({...metrics, totalSets: Number(e.target.value)})}
                />
                <Input
                  label="Total de Repetições"
                  type="number"
                  value={metrics.totalReps || ''}
                  onChange={e => setMetrics({...metrics, totalReps: Number(e.target.value)})}
                />
                <Input
                  label="Volume Levantado (Kg)"
                  type="number"
                  value={metrics.totalVolumeKg || ''}
                  onChange={e => setMetrics({...metrics, totalVolumeKg: Number(e.target.value)})}
                />
              </div>
            )}

            {sportKey === 'football' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Resultado
                  </label>
                  <select
                    className="input-precision py-2 text-sm"
                    value={metrics.matchResult || 'win'}
                    onChange={e => setMetrics({...metrics, matchResult: e.target.value})}
                  >
                    <option value="win">Vitória</option>
                    <option value="draw">Empate</option>
                    <option value="loss">Derrota</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Tipo de Partida
                  </label>
                  <select
                    className="input-precision py-2 text-sm"
                    value={metrics.matchType || ''}
                    onChange={e => setMetrics({...metrics, matchType: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="futebol_campo">Futebol de Campo</option>
                    <option value="society_7">Society (Fut 7)</option>
                    <option value="futsal">Futsal</option>
                    <option value="treino">Treino</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Posição
                  </label>
                  <select
                    className="input-precision py-2 text-sm"
                    value={metrics.position || ''}
                    onChange={e => setMetrics({...metrics, position: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="goleiro">Goleiro</option>
                    <option value="zagueiro">Zagueiro</option>
                    <option value="lateral">Lateral</option>
                    <option value="meia">Meia</option>
                    <option value="atacante">Atacante</option>
                  </select>
                </div>
                <Input
                  label="Gols"
                  type="number"
                  min={0}
                  value={metrics.goals || ''}
                  onChange={e => setMetrics({...metrics, goals: Number(e.target.value)})}
                />
                <Input
                  label="Assistências"
                  type="number"
                  min={0}
                  value={metrics.assists || ''}
                  onChange={e => setMetrics({...metrics, assists: Number(e.target.value)})}
                />
                <Input
                  label="Distância Est. (km)"
                  type="number"
                  step="0.1"
                  min={0}
                  value={metrics.distanceEstimatedKm || ''}
                  onChange={e => setMetrics({...metrics, distanceEstimatedKm: Number(e.target.value)})}
                />
              </div>
            )}

            {sportKey === 'futevolei' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input
                  label="Qtd. de Sets"
                  type="number"
                  min={1}
                  value={metrics.setsCount || ''}
                  onChange={e => setMetrics({...metrics, setsCount: Number(e.target.value)})}
                />
                <Input
                  label="Sets Vencidos"
                  type="number"
                  min={0}
                  value={metrics.setsWon || ''}
                  onChange={e => setMetrics({...metrics, setsWon: Number(e.target.value)})}
                />
                <Input
                  label="Sets Perdidos"
                  type="number"
                  min={0}
                  value={metrics.setsLost || ''}
                  onChange={e => setMetrics({...metrics, setsLost: Number(e.target.value)})}
                />
                <Input
                  label="Recepções Certas"
                  type="number"
                  min={0}
                  value={metrics.successfulReceptions || ''}
                  onChange={e => setMetrics({...metrics, successfulReceptions: Number(e.target.value)})}
                />
                <Input
                  label="Levantadas Certas"
                  type="number"
                  min={0}
                  value={metrics.successfulSets || ''}
                  onChange={e => setMetrics({...metrics, successfulSets: Number(e.target.value)})}
                />
                <Input
                  label="Ataques Certos"
                  type="number"
                  min={0}
                  value={metrics.successfulAttacks || ''}
                  onChange={e => setMetrics({...metrics, successfulAttacks: Number(e.target.value)})}
                />
                <Input
                  label="Total de Saques"
                  type="number"
                  min={0}
                  value={metrics.serves || ''}
                  onChange={e => setMetrics({...metrics, serves: Number(e.target.value)})}
                />
                <Input
                  label="Aces"
                  type="number"
                  min={0}
                  value={metrics.aces || ''}
                  onChange={e => setMetrics({...metrics, aces: Number(e.target.value)})}
                />
                <Input
                  label="Erros de Ataque"
                  type="number"
                  min={0}
                  value={metrics.attackErrors || ''}
                  onChange={e => setMetrics({...metrics, attackErrors: Number(e.target.value)})}
                />
                <Input
                  label="Dupla (Nome)"
                  type="text"
                  value={metrics.partnerName || ''}
                  onChange={e => setMetrics({...metrics, partnerName: e.target.value})}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
                    Tipo de Quadra
                  </label>
                  <select
                    className="input-precision py-2 text-sm"
                    value={metrics.courtType || ''}
                    onChange={e => setMetrics({...metrics, courtType: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="sand_beach">Praia (Areia Fofa)</option>
                    <option value="sand_court">Quadra (Areia Dura)</option>
                  </select>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* STEP 3: RPE and Notes */}
      {step === 3 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <Card className="p-6 bg-[#0D1C2D] border-[#1F2937]">
            <RpeSelector
              rpe={rpe}
              onChangeRpe={setRpe}
              durationMinutes={durationMinutes}
              notes={notes}
              onChangeNotes={setNotes}
            />
          </Card>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between mt-4">
        <Button variant="secondary" onClick={handleBack} leftIcon={<ChevronLeft className="h-4 w-4" />}>
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </Button>
        
        {step < 3 ? (
          <Button variant="tactile" onClick={handleNext} disabled={step === 1 && !sportKey} rightIcon={<ChevronRight className="h-4 w-4" />}>
            Continuar
          </Button>
        ) : (
          <Button variant="tactile" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={<CheckCircle className="h-4 w-4" />}>
            Salvar Alterações
          </Button>
        )}
      </div>
    </div>
  );
};
