import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import { SPORT_KEYS, type SessionDTO, type SportKey } from '@pacelog/shared';
import { Activity, Zap, Sun, Dumbbell, Flame, Search, Waves, Bike, Shield, X } from 'lucide-react';
import { formatDuration } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';

const sportMeta: Record<string, { name: string; color: string; icon: React.ElementType; badge: 'cyan' | 'amber' | 'crimson' | 'purple' | 'green' | 'blue' }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity, badge: 'cyan' },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame, badge: 'green' },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun, badge: 'amber' },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap, badge: 'crimson' },
  jiujitsu: { name: 'Jiu-Jitsu', color: '#E11D48', icon: Shield, badge: 'crimson' },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell, badge: 'purple' },
  swimming: { name: 'Natação', color: '#38BDF8', icon: Waves, badge: 'blue' },
  cycling: { name: 'Ciclismo', color: '#10B981', icon: Bike, badge: 'green' },
};

function startOfWeek(date: Date, weekStart: 'monday' | 'sunday' = 'monday'): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = weekStart === 'sunday' ? copy.getDay() : (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getSessionGroupLabel(
  dateInput: Date | string,
  now: Date,
  weekStart: 'monday' | 'sunday' = 'monday'
): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Outros';

  const currentWeekStart = startOfWeek(now, weekStart);
  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(currentWeekStart.getDate() - 7);

  const sessionWeekStart = startOfWeek(date, weekStart);
  if (sessionWeekStart.getTime() === currentWeekStart.getTime()) {
    return 'Esta semana';
  }
  if (sessionWeekStart.getTime() === lastWeekStart.getTime()) {
    return 'Semana passada';
  }

  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function getPrimaryMetrics(
  session: SessionDTO,
  formatters: {
    formatDistance: (km: number, decimals?: number) => string;
    formatWeight: (kg: number, decimals?: number) => string;
    formatSpeed: (kmh: number) => string;
  }
): [string, string] {
  const duration = formatDuration(session.durationSeconds);
  const load = `${Math.round(session.sessionalLoad || 0)} AU`;

  switch (session.sportKey) {
    case 'running': {
      const km = session.metrics?.distanceKm !== undefined
        ? Number(session.metrics.distanceKm)
        : (Number(session.metrics?.distanceMeters || 0) / 1000);
      return [formatters.formatDistance(km, 1), duration];
    }
    case 'cycling': {
      const primary = session.metrics?.distanceKm
        ? formatters.formatDistance(Number(session.metrics.distanceKm), 1)
        : session.metrics?.averageSpeedKmh
          ? formatters.formatSpeed(Number(session.metrics.averageSpeedKmh))
          : load;
      return [primary, duration];
    }
    case 'swimming': {
      const meters = session.metrics?.totalDistanceMeters || session.metrics?.distanceMeters || 0;
      return [`${meters} m`, duration];
    }
    case 'strength': {
      const primary = session.metrics?.totalVolumeKg
        ? formatters.formatWeight(Number(session.metrics.totalVolumeKg), 0)
        : `${session.metrics?.totalSets || 0} séries`;
      return [primary, duration];
    }
    case 'jiujitsu': {
      const primary = session.metrics?.roundsCount
        ? `${session.metrics.roundsCount} rolas`
        : session.metrics?.gi === false
          ? 'No-Gi'
          : 'Gi';
      return [primary, duration];
    }
    case 'boxing': {
      return [`${session.metrics?.roundsCount || 0} rds`, duration];
    }
    case 'futevolei': {
      const primary = session.metrics?.setsCount ? `${session.metrics.setsCount} sets` : load;
      return [primary, duration];
    }
    default: {
      if (session.metrics?.distanceKm || session.metrics?.distanceMeters) {
        const km = session.metrics.distanceKm !== undefined
          ? Number(session.metrics.distanceKm)
          : Number(session.metrics.distanceMeters || 0) / 1000;
        return [formatters.formatDistance(km, 1), duration];
      }
      if (session.metrics?.totalVolumeKg) {
        return [formatters.formatWeight(Number(session.metrics.totalVolumeKg), 0), duration];
      }
      return [duration, load];
    }
  }
}

function getRpeBadgeVariant(rpe: number): 'sage' | 'amber' | 'orange' | 'crimson' {
  if (rpe >= 9) return 'crimson';
  if (rpe >= 7) return 'orange';
  if (rpe >= 5) return 'amber';
  return 'sage';
}

export const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, userSports, formatDistance, formatWeight, formatSpeed, formatTime } = useSettings();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportKey | 'all'>('all');

  const resolveSportMeta = (key: string) => {
    const found = userSports.find((s) => s.sportKey === key);
    const base = sportMeta[key];
    return {
      name: found?.displayName || base?.name || key,
      color: base?.color || '#38BDF8',
      icon: base?.icon || Activity,
      badge: base?.badge || ('cyan' as const),
    };
  };

  const sportFilterKeys = useMemo(() => {
    const keys = new Set<string>(SPORT_KEYS);
    for (const s of userSports) {
      if (s.isActive) keys.add(s.sportKey);
    }
    for (const s of sessions) {
      keys.add(s.sportKey);
    }
    return Array.from(keys);
  }, [userSports, sessions]);

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

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sessions.filter((session) => {
      if (selectedSport !== 'all' && session.sportKey !== selectedSport) {
        return false;
      }
      if (!query) return true;
      const meta = resolveSportMeta(session.sportKey);
      const dateStr = new Date(session.startedAt).toLocaleDateString('pt-BR');
      const notes = (session.notes || '').toLowerCase();
      return (
        meta.name.toLowerCase().includes(query) ||
        session.sportKey.toLowerCase().includes(query) ||
        dateStr.includes(query) ||
        notes.includes(query)
      );
    });
  }, [sessions, selectedSport, searchQuery, userSports]);

  const groupedSessions = useMemo(() => {
    const now = new Date();
    const weekStart = settings?.weekStart || 'monday';
    const groups: Array<{ label: string; items: SessionDTO[] }> = [];
    const indexByLabel = new Map<string, number>();

    for (const session of filteredSessions) {
      const label = getSessionGroupLabel(session.startedAt, now, weekStart);
      const existingIdx = indexByLabel.get(label);
      if (existingIdx !== undefined) {
        groups[existingIdx].items.push(session);
      } else {
        indexByLabel.set(label, groups.length);
        groups.push({ label, items: [session] });
      }
    }

    return groups;
  }, [filteredSessions, settings?.weekStart]);

  return (
    <div className="flex flex-col gap-4 font-sans max-w-4xl mx-auto w-full pb-24">
      {/* Header compacto */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Diário de Treinos
          </h1>
          {!isLoading && (
            <span className="font-mono text-[10px] text-[#8F9380] uppercase">
              {filteredSessions.length} {filteredSessions.length === 1 ? 'sessão' : 'sessões'}
            </span>
          )}
        </div>
      </div>

      {/* Linha única horizontal: busca + pílulas de esporte com scroll suave */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
        <div className="relative flex items-center shrink-0 w-36 sm:w-44">
          <Search className="h-3.5 w-3.5 text-[#8F9380] absolute left-2.5 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar sessões"
            className="w-full h-8 pl-8 pr-6 rounded-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-xs font-mono text-[#D4E4FA] placeholder:text-[#8F9380] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="absolute right-2 text-[#8F9380] hover:text-[#D4E4FA]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSelectedSport('all')}
          className={`shrink-0 h-8 px-3 rounded-full font-mono text-[11px] uppercase font-bold border transition-all cursor-pointer ${
            selectedSport === 'all'
              ? 'bg-[#D4F684] text-[#051424] border-[#D4F684]'
              : 'bg-[#0D1C2D] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
          }`}
        >
          Todos
        </button>

        {sportFilterKeys.map((key) => {
          const meta = resolveSportMeta(key);
          const Icon = meta.icon;
          const active = selectedSport === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedSport(active ? 'all' : (key as SportKey))}
              className={`shrink-0 h-8 inline-flex items-center gap-1.5 px-3 rounded-full font-mono text-[11px] uppercase font-bold border transition-all cursor-pointer ${
                active
                  ? 'bg-[#161C24] text-[#D4E4FA] border-[#D4F684]'
                  : 'bg-[#0D1C2D] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
              }`}
            >
              <Icon className="h-3 w-3" style={{ color: active ? meta.color : undefined }} />
              <span>{meta.name}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="font-mono text-xs text-[#8F9380] animate-pulse">Carregando histórico...</div>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-10 flex flex-col items-center justify-center gap-3 border-dashed border-[#454839]">
          <Activity className="h-8 w-8 text-[#8F9380]" />
          <span className="font-mono text-sm text-[#C5C8B4] uppercase">Nenhum treino registrado</span>
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card className="p-8 flex flex-col items-center justify-center gap-2 border-dashed border-[#1F2937] bg-[#0D1C2D]">
          <span className="font-mono text-xs text-[#C5C8B4] uppercase">
            Nenhuma sessão encontrada para o filtro
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedSport('all');
            }}
            className="font-mono text-[11px] text-[#D4F684] uppercase hover:underline"
          >
            Limpar filtros
          </button>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedSessions.map((group) => (
            <section key={group.label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-0.5">
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#8F9380] shrink-0">
                  {group.label}
                </h2>
                <div className="flex-1 h-px bg-[#1F2937]/70" />
                <span className="font-mono text-[10px] text-[#4A5568]">
                  {group.items.length}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {group.items.map((session) => {
                  const meta = resolveSportMeta(session.sportKey);
                  const Icon = meta.icon;
                  const [primaryMetric, secondaryMetric] = getPrimaryMetrics(session, {
                    formatDistance,
                    formatWeight,
                    formatSpeed,
                  });
                  const dateLabel = new Date(session.startedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  });
                  const timeLabel = formatTime(session.startedAt);

                  return (
                    <Card
                      key={session.id}
                      variant="simple"
                      className="px-3 py-2.5 flex items-center justify-between gap-3 bg-[#0D1C2D] hover:bg-[#161C24] transition-colors cursor-pointer border-[#1F2937] hover:border-[#454839] rounded-[4px]"
                      onClick={() =>
                        navigate(
                          session.sportKey === 'strength'
                            ? `/strength/sessions/${session.id}`
                            : `/sessions/${session.id}`
                        )
                      }
                    >
                      {/* Esquerda: Ícone + Nome / Data */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-[#051424] border border-[#1F2937] shrink-0"
                          style={{ borderColor: `${meta.color}30` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: meta.color }} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase truncate leading-tight">
                            {meta.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#8F9380] leading-tight mt-0.5">
                            {dateLabel} • {timeLabel}
                          </span>
                        </div>
                      </div>

                      {/* Direita: 2 métricas principais + Badge de RPE */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex flex-col items-end leading-tight">
                          <span className="font-mono text-xs font-bold text-[#D4E4FA]">
                            {primaryMetric}
                          </span>
                          <span className="font-mono text-[10px] text-[#8F9380] mt-0.5">
                            {secondaryMetric}
                          </span>
                        </div>

                        <Badge
                          variant={getRpeBadgeVariant(session.rpe)}
                          size="sm"
                          className="px-1.5 py-0.5 text-[10px] tracking-normal shrink-0"
                        >
                          RPE {session.rpe}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
