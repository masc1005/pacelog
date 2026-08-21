import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import type { SessionDTO, SportKey } from '@pacelog/shared';
import { Activity, Zap, Sun, Dumbbell, Flame, Search } from 'lucide-react';
import { formatDuration } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any; badge: 'cyan'|'amber'|'crimson'|'purple'|'green' }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity, badge: 'cyan' },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame, badge: 'green' },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun, badge: 'amber' },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap, badge: 'crimson' },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell, badge: 'purple' },
};

export const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await apiClient<SessionDTO[]>('/api/sessions?limit=20');
        setSessions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, []);

  return (
    <div className="flex flex-col gap-6 font-sans max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Diário de Treinos
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Histórico completo de telemetria
          </p>
        </div>
        <div className="bg-[#161C24] p-2 rounded-full border border-[#1F2937]">
          <Search className="h-5 w-5 text-[#C5C8B4]" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="font-mono text-xs text-[#8F9380] animate-pulse">Carregando histórico...</div>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center gap-3 border-dashed border-[#454839]">
          <Activity className="h-8 w-8 text-[#8F9380]" />
          <span className="font-mono text-sm text-[#C5C8B4] uppercase">Nenhum treino registrado</span>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map(session => {
            const meta = sportMeta[session.sportKey] || sportMeta.running;
            const Icon = meta.icon;
            
            return (
              <Card 
                key={session.id} 
                variant="watch" 
                className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[#161C24] hover:bg-[#1a232d] transition-colors cursor-pointer border-[#1F2937] hover:border-[#454839]"
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center rounded-[2px] bg-[#051424] border border-[#1F2937]">
                    <Icon className="h-6 w-6" style={{ color: meta.color }} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-[#D4E4FA] uppercase">{meta.name}</span>
                      <Badge variant={meta.badge} size="sm">{new Date(session.startedAt).toLocaleDateString('pt-BR')}</Badge>
                    </div>
                    <span className="font-mono text-[10px] text-[#8F9380] uppercase mt-1">
                      DURAÇÃO: {formatDuration(session.durationSeconds)} | CARGA sRPE: {session.sessionalLoad}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-[#1F2937] pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[9px] text-[#8F9380] uppercase">RPE</span>
                    <span className="font-display text-xl font-bold text-[#FF6B35]">{session.rpe}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 sm:flex-auto">
                    <span className="font-mono text-[9px] text-[#8F9380] uppercase">Destaque</span>
                    <span className="font-display text-sm font-bold text-[#D4E4FA]">
                      {session.sportKey === 'running' ? `${(session.metrics?.distanceMeters || 0)/1000} km` : 
                       session.sportKey === 'boxing' ? `${session.metrics?.roundsCount || 0} rds` : 
                       session.sportKey === 'strength' ? `${session.metrics?.totalSets || 0} sets` : '100%'}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
