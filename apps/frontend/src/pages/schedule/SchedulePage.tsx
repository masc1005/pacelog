import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { WeeklyScheduleCard } from '../../components/schedule/WeeklyScheduleCard';
import { apiClient } from '../../lib/api';

export const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    apiClient<any[]>('/api/sessions?limit=30')
      .then((data) => {
        if (Array.isArray(data)) setRecentSessions(data);
      })
      .catch(() => setRecentSessions([]));
  }, []);

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

      <WeeklyScheduleCard recentSessions={recentSessions} compact={false} />
    </div>
  );
};
