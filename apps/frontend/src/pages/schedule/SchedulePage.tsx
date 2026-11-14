import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { WeeklyScheduleCard } from '../../components/schedule/WeeklyScheduleCard';
import { apiClient } from '../../lib/api';
import { scheduleApi } from '../../services/schedule.api';

export const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [deload, setDeload] = useState<{ needed: boolean; reasons: string[] }>({ needed: false, reasons: [] });
  const [activatingDeload, setActivatingDeload] = useState(false);

  useEffect(() => {
    apiClient<any[]>('/api/sessions?limit=30')
      .then((data) => {
        if (Array.isArray(data)) setRecentSessions(data);
      })
      .catch(() => setRecentSessions([]));
    apiClient<typeof deload>('/api/progress/deload')
      .then(setDeload)
      .catch(() => setDeload({ needed: false, reasons: [] }));
  }, []);

  const activateDeload = async () => {
    setActivatingDeload(true);
    try {
      await scheduleApi.activateDeload();
      setDeload({ needed: false, reasons: [] });
    } finally {
      setActivatingDeload(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-24 font-sans text-[#D4E4FA]">
      <header className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Início
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#D4F684]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#D4E4FA] font-bold">
            Cronograma da Semana
          </span>
        </div>
      </header>
      {deload.needed && (
        <div className="flex items-center justify-between gap-4 rounded border border-[#FFB800]/40 bg-[#FFB800]/10 p-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-[#FFB800]">Modo Deload Semanal recomendado</p>
            <p className="mt-1 font-mono text-[10px] text-[#C5C8B4]">{deload.reasons.join(' · ')}</p>
          </div>
          <button
            type="button"
            onClick={activateDeload}
            disabled={activatingDeload}
            className="shrink-0 rounded bg-[#FFB800] px-3 py-2 font-mono text-[10px] font-bold uppercase text-[#051424] disabled:opacity-50"
          >
            {activatingDeload ? 'Aplicando…' : 'Ativar'}
          </button>
        </div>
      )}

      <WeeklyScheduleCard recentSessions={recentSessions} compact={false} />
    </div>
  );
};
