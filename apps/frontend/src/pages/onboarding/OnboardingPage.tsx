import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Activity, Zap, Sun, Dumbbell, Flame, ChevronRight, Target, Waves, Bike } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any; desc: string }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity, desc: 'Rua, trilha ou esteira' },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame, desc: 'Campo, society ou futsal' },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun, desc: 'Praia ou quadra de areia' },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap, desc: 'Rounds, sparring e condicionamento' },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell, desc: 'Séries, reps e tonelagem' },
  swimming: { name: 'Natação', color: '#38BDF8', icon: Waves, desc: 'Piscina ou águas abertas' },
  cycling: { name: 'Ciclismo', color: '#10B981', icon: Bike, desc: 'Rua, indoor, mountain bike e misto' },
};

const STEPS = ['Boas-vindas', 'Esportes', 'Meta Inicial', 'Pronto'];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const [step, setStep] = useState(0);
  const [selectedSports, setSelectedSports] = useState<SportKey[]>([]);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleSport = (key: SportKey) => {
    setSelectedSports(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      if (goalTitle && goalTarget) {
        await apiClient('/api/goals', {
          method: 'POST',
          body: JSON.stringify({
            title: goalTitle,
            type: 'frequency',
            sportKey: selectedSports[0] || null,
            targetValue: Number(goalTarget),
            unit: 'sessions',
            period: 'weekly',
          }),
        }).catch(() => {}); // Non-blocking
      }
      success('Bem-vindo ao PACELOG! Sua base tática está pronta.');
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1117] text-[#D4E4FA] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="path-line pointer-events-none" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border transition-all ${
              i < step ? 'bg-[#D4F684] border-[#D4F684] text-[#051424]' :
              i === step ? 'border-[#D4F684] text-[#D4F684]' :
              'border-[#1F2937] text-[#454839]'
            }`}>{i + 1}</div>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-[#D4F684]' : 'bg-[#1F2937]'}`} />}
          </div>
        ))}
      </div>

      <main className="w-full max-w-lg flex flex-col gap-6 relative z-10">
        {/* STEP 0: Boas-vindas */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="font-mono text-sm tracking-[0.25em] text-[#D4F684] uppercase font-bold">PACELOG</div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#D4E4FA] leading-tight">
              Base Tática<br />Inicializada
            </h1>
            <p className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider max-w-sm">
              Em 3 passos rápidos, personalizamos o painel para o seu perfil de atleta.
            </p>
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
              {['Registro Científico', 'ACWR Fisiológico', 'Coach com IA'].map(feat => (
                <Card key={feat} className="p-3 text-center border-[#1F2937] bg-[#0D1C2D]">
                  <span className="font-mono text-[9px] text-[#C5C8B4] uppercase tracking-wider">{feat}</span>
                </Card>
              ))}
            </div>
            <Button variant="tactile" size="lg" onClick={() => setStep(1)} rightIcon={<ChevronRight className="h-4 w-4" />} className="w-full tracking-widest">
              Iniciar Configuração
            </Button>
          </div>
        )}

        {/* STEP 1: Seleção de esportes */}
        {step === 1 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase">Suas Modalidades</h2>
              <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase tracking-widest">Selecione os esportes que pratica</p>
            </div>
            <div className="flex flex-col gap-3">
              {SPORT_KEYS.map(key => {
                const meta = sportMeta[key];
                const Icon = meta.icon;
                const isSelected = selectedSports.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleSport(key)}
                    className={`flex items-center gap-4 p-4 rounded-[2px] cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#161C24] border-[#D4F684] shadow-[0_0_12px_rgba(212,246,132,0.1)]'
                        : 'bg-[#0D1C2D] border-[#1F2937] hover:border-[#454839]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#051424]">
                      <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-bold text-[#D4E4FA]">{meta.name}</p>
                      <p className="font-mono text-[10px] text-[#8F9380]">{meta.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${isSelected ? 'bg-[#D4F684] border-[#D4F684]' : 'border-[#454839]'}`} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">Voltar</Button>
              <Button variant="tactile" onClick={() => setStep(2)} disabled={selectedSports.length === 0} className="flex-1 tracking-widest" rightIcon={<ChevronRight className="h-4 w-4" />}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Meta inicial */}
        {step === 2 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase">Meta Inicial</h2>
              <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase tracking-widest">Defina seu primeiro marco semanal (opcional)</p>
            </div>
            <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-[#D4F684]" />
                <span className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">Exemplo: "4 treinos por semana"</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">Título da Meta</label>
                <input
                  className="input-precision p-2 text-sm w-full"
                  placeholder="Ex: Consistência Semanal"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">Sessões por semana</label>
                <input
                  className="input-precision p-2 text-sm w-32"
                  type="number"
                  min="1"
                  max="14"
                  placeholder="4"
                  value={goalTarget}
                  onChange={e => setGoalTarget(e.target.value)}
                />
              </div>
            </Card>
            <div className="flex gap-3 mt-2">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
              <Button variant="tactile" onClick={() => setStep(3)} className="flex-1 tracking-widest" rightIcon={<ChevronRight className="h-4 w-4" />}>
                {goalTitle ? 'Definir Meta' : 'Pular'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Pronto */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 rounded-full bg-[#0D2B1A] border-2 border-[#D4F684] flex items-center justify-center shadow-[0_0_30px_rgba(212,246,132,0.2)]">
              <span className="text-3xl">🎯</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-[#D4E4FA] uppercase">Tudo Pronto</h2>
            <p className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider max-w-sm">
              Sua base tática está configurada.<br />O primeiro registro de telemetria é o início da sua evolução.
            </p>
            <Button variant="tactile" size="lg" onClick={handleFinish} isLoading={isLoading} className="w-full tracking-widest">
              Acessar o Painel
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};
