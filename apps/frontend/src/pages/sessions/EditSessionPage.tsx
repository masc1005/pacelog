import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { SPORT_KEYS, type SportKey, type SessionDTO } from '@pacelog/shared';
import { apiClient } from '../../lib/api';
import { Activity, Zap, Sun, Dumbbell, Flame, CheckCircle, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell },
};

export const EditSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [sportKey, setSportKey] = useState<SportKey | ''>('');
  const [startedAt, setStartedAt] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [rpe, setRpe] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  
  // Dynamic metrics state
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await apiClient<SessionDTO>(`/api/sessions/${id}`);
        setSportKey(session.sportKey);
        setStartedAt(new Date(session.startedAt).toISOString().slice(0, 16));
        setDurationMinutes(Math.round(session.durationSeconds / 60));
        setRpe(session.rpe);
        setNotes(session.notes || '');
        
        // Populate metrics based on sport
        const m = { ...session.metrics };
        if (session.sportKey === 'running' && m.distanceMeters) {
          m.distanceKm = m.distanceMeters / 1000;
          if (m.paceSecondsPerKm) {
            m.paceMin = Math.floor(m.paceSecondsPerKm / 60);
            m.paceSec = m.paceSecondsPerKm % 60;
          }
        }
        setMetrics(m);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar sessão.');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [id]);

  const handleNext = () => {
    if (step === 1 && sportKey) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else navigate(-1);
  };

  const handleSubmit = async () => {
    if (!sportKey) return;
    setIsSubmitting(true);
    try {
      // Pre-process metrics
      const finalMetrics = { ...metrics };
      
      finalMetrics.durationSeconds = durationMinutes * 60;
      
      if (sportKey === 'running' && finalMetrics.distanceKm) {
        finalMetrics.distanceMeters = finalMetrics.distanceKm * 1000;
        finalMetrics.paceSecondsPerKm = (finalMetrics.paceMin * 60) + finalMetrics.paceSec;
      }

      const payload: Partial<SessionDTO> = {
        sportKey: sportKey as SportKey,
        startedAt: new Date(startedAt).toISOString(),
        durationSeconds: durationMinutes * 60,
        rpe,
        sessionalLoad: rpe * durationMinutes, // Foster TRIMP
        metrics: finalMetrics,
        notes,
      };

      await apiClient(`/api/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      navigate(`/sessions/${id}`, { replace: true });
    } catch (err) {
      console.error(err);
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
          <Card className="p-6 bg-[#0D1C2D] border-[#1F2937]">
            <label className="block font-mono text-xs text-[#C5C8B4] uppercase tracking-widest mb-4">
              Modalidade
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SPORT_KEYS.map(key => {
                const meta = sportMeta[key];
                const Icon = meta.icon;
                const isSelected = sportKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSportKey(key)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[2px] cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#161C24] border-[#D4F684] shadow-[0_0_15px_rgba(212,246,132,0.1)]'
                        : 'bg-[#051424] border-[#1F2937] hover:border-[#454839]'
                    }`}
                  >
                    <Icon className="h-6 w-6" style={{ color: isSelected ? meta.color : '#8F9380' }} />
                    <span className={`font-mono text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-[#D4E4FA]' : 'text-[#8F9380]'}`}>
                      {meta.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            )}

            {sportKey === 'strength' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Total de Séries"
                  type="number"
                  value={metrics.totalSets || ''}
                  onChange={e => setMetrics({...metrics, totalSets: Number(e.target.value)})}
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            )}
          </Card>
        </div>
      )}

      {/* STEP 3: RPE and Notes */}
      {step === 3 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-6">
            <div>
              <label className="block font-mono text-xs text-[#C5C8B4] uppercase tracking-widest mb-4">
                Percepção Subjetiva de Esforço (RPE)
              </label>
              
              <div className="flex items-center gap-4 mb-2">
                <span className="font-display text-4xl font-bold text-[#FF6B35]">{rpe}</span>
                <div className="flex-1 flex flex-col gap-1">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={rpe}
                    onChange={e => setRpe(Number(e.target.value))}
                    className="w-full accent-[#FF6B35]"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-[#8F9380] px-1">
                    <span>1 (Muito Leve)</span>
                    <span>10 (Exaustivo)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#161C24] border border-[#1F2937] rounded-[2px] flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#C5C8B4] uppercase">Carga Sessional (Foster TRIMP)</span>
                <span className="font-mono text-sm font-bold text-[#D4F684]">{rpe * durationMinutes}</span>
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs text-[#C5C8B4] uppercase tracking-widest mb-2">
                Notas Táticas (Opcional)
              </label>
              <textarea
                className="w-full input-precision min-h-[80px] p-2 text-sm resize-y"
                placeholder="Como foi o desempenho? Sentiu alguma dor?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
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
