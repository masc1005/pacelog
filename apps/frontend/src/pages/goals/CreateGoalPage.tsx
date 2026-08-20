import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Activity, Zap, Sun, Dumbbell, Flame, Plus } from 'lucide-react';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell },
};

const GOAL_TYPES = [
  { value: 'frequency', label: 'Frequência', unit: 'sessions', placeholder: 'Ex: 4 treinos' },
  { value: 'volume', label: 'Distância', unit: 'km', placeholder: 'Ex: 30 km' },
  { value: 'consistency', label: 'Consistência', unit: 'days', placeholder: 'Ex: 21 dias' },
];

const PERIODS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

export const CreateGoalPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('frequency');
  const [sportKey, setSportKey] = useState<SportKey | ''>('');
  const [targetValue, setTargetValue] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [deadline, setDeadline] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedType = GOAL_TYPES.find(g => g.value === type)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toastError('Informe o título da meta.'); return; }
    if (!targetValue || Number(targetValue) <= 0) { toastError('Informe um valor alvo válido.'); return; }

    setIsLoading(true);
    try {
      await apiClient('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          type,
          sportKey: sportKey || null,
          targetValue: Number(targetValue),
          unit: selectedType.unit,
          period,
          deadline: deadline || null,
        }),
      });
      success('Meta criada com sucesso!');
      navigate('/goals');
    } catch {
      toastError('Erro ao criar meta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">Nova Meta</h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">Defina seu próximo marco tático</p>
        </div>
        <Link to="/goals">
          <Badge variant="neutral" size="sm" className="cursor-pointer hover:opacity-80">Cancelar</Badge>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Título */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <label className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">Título da Meta</label>
          <input
            className="input-precision py-2 text-sm w-full"
            placeholder="Ex: 4 treinos por semana"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </Card>

        {/* Tipo e Período */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">Tipo de Meta</label>
            <div className="flex gap-2">
              {GOAL_TYPES.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setType(g.value)}
                  className={`flex-1 py-2 rounded-[2px] font-mono text-[10px] uppercase tracking-wider font-bold border transition-all ${
                    type === g.value
                      ? 'bg-[#D4F684] text-[#051424] border-[#D4F684]'
                      : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:border-[#454839]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <label className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">
                Alvo ({selectedType.unit})
              </label>
              <input
                className="input-precision py-2 text-sm w-full"
                type="number"
                min="1"
                placeholder={selectedType.placeholder}
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">Período</label>
              <select
                className="input-precision py-2 text-sm w-full"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              >
                {PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Esporte (opcional) */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <label className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">
            Esporte Vinculado <span className="text-[#454839]">(opcional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSportKey('')}
              className={`px-3 py-1.5 rounded-[2px] font-mono text-[10px] uppercase font-bold border transition-all ${
                sportKey === '' ? 'bg-[#D4F684] text-[#051424] border-[#D4F684]' : 'bg-[#161C24] text-[#8F9380] border-[#1F2937]'
              }`}
            >
              Todos
            </button>
            {SPORT_KEYS.map(key => {
              const meta = sportMeta[key];
              const Icon = meta.icon;
              const isSelected = sportKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSportKey(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-mono text-[10px] uppercase font-bold border transition-all ${
                    isSelected ? 'bg-[#161C24] border-[#D4F684] text-[#D4E4FA]' : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:border-[#454839]'
                  }`}
                >
                  <Icon className="h-3 w-3" style={{ color: isSelected ? meta.color : '#8F9380' }} />
                  {meta.name}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Prazo (opcional) */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <label className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">
            Prazo <span className="text-[#454839]">(opcional)</span>
          </label>
          <input
            className="input-precision py-2 text-sm w-full"
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />
        </Card>

        <Button type="submit" variant="tactile" isLoading={isLoading} leftIcon={<Plus className="h-4 w-4" />} className="w-full tracking-widest text-base py-3 mt-2">
          Criar Meta
        </Button>
      </form>
    </div>
  );
};
