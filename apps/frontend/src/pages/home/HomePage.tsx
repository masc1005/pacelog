import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Flame,
  Target,
  Clock,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
  Zap,
  Dumbbell,
  Sun,
  Award,
} from 'lucide-react';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';
import { formatPace, formatDuration } from '../../lib/utils';

interface MockSession {
  id: string;
  sportKey: SportKey;
  title: string;
  startedAt: string;
  durationSeconds: number;
  rpe?: number;
  metrics: Record<string, any>;
}

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSport, setSelectedSport] = useState<SportKey | 'all'>('all');
  const [athleteProfile, setAthleteProfile] = useState<any>(null);

  // Carrega perfil inicial do backend
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3333'}/api/profile`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAthleteProfile(data.profile);
        }
      } catch {
        // Silencioso se estiver offline ou em carregamento inicial
      }
    }
    loadProfile();
  }, []);

  const sportMeta: Record<
    SportKey,
    { name: string; color: string; badge: 'cyan' | 'green' | 'amber' | 'crimson' | 'purple'; icon: any }
  > = {
    running: { name: 'Corrida', color: '#00F0FF', badge: 'cyan', icon: Activity },
    football: { name: 'Futebol', color: '#39FF14', badge: 'green', icon: Flame },
    futevolei: { name: 'Futevôlei', color: '#FFB800', badge: 'amber', icon: Sun },
    boxing: { name: 'Boxe', color: '#FF3366', badge: 'crimson', icon: Zap },
    strength: { name: 'Musculação', color: '#7B2CBF', badge: 'purple', icon: Dumbbell },
  };

  // Mock de sessões recentes para visualização inicial no dashboard
  const recentSessions: MockSession[] = [
    {
      id: 'sess-1',
      sportKey: 'running',
      title: 'Treino de Ritmo & Intervalos',
      startedAt: 'Hoje às 06:30',
      durationSeconds: 2740, // 45m 40s
      rpe: 8,
      metrics: { distanceKm: 10.2, avgPaceSecKm: 268 }, // 4:28/km
    },
    {
      id: 'sess-2',
      sportKey: 'boxing',
      title: 'Sparring Tático & Manopla',
      startedAt: 'Ontem às 18:00',
      durationSeconds: 3600,
      rpe: 9,
      metrics: { rounds: 8, punchesThrown: 420 },
    },
    {
      id: 'sess-3',
      sportKey: 'strength',
      title: 'Membros Inferiores & Força Pura',
      startedAt: '18 Ago às 07:15',
      durationSeconds: 3300,
      rpe: 8,
      metrics: { exercises: 6, totalVolumeKg: 8450 },
    },
  ];

  const filteredSessions =
    selectedSport === 'all'
      ? recentSessions
      : recentSessions.filter((s) => s.sportKey === selectedSport);

  const weeklyGoal = athleteProfile?.weeklySessionGoal || 5;
  const completedThisWeek = 3;
  const progressPercent = Math.min(100, Math.round((completedThisWeek / weeklyGoal) * 100));

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* 1. Hero & Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0E1117] via-[#141822] to-[#0E1117] border border-[#1E232E] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="green" size="sm" pulse>
                PAINEL OPERACIONAL
              </Badge>
              <span className="font-mono text-xs text-gray-400">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Olá, {user?.name?.split(' ')[0] || 'Atleta'}! ⚡
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl font-sans">
              Pronto para elevar o padrão? Seu histórico de telemetria e consistência está sincronizado.
            </p>
          </div>

          {/* Quick Action Button */}
          <Link to="/sessions/new">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
              className="w-full sm:w-auto font-mono font-bold tracking-wider shadow-[0_0_25px_rgba(0,240,255,0.35)]"
            >
              REGISTRAR TREINO
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Key Metrics & Telemetry Bar */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <Card glow="amber" className="flex items-center gap-4 p-5">
          <div className="h-12 w-12 rounded-xl bg-[#FFB800]/10 border border-[#FFB800]/30 flex items-center justify-center shrink-0">
            <Flame className="h-6 w-6 text-[#FFB800] animate-bounce" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              Sequência Ativa
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-white">4</span>
              <span className="font-mono text-xs text-[#FFB800] font-semibold">DIAS SEGUIDOS</span>
            </div>
          </div>
        </Card>

        {/* Weekly Goal Progress */}
        <Card glow="cyan" className="flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              Meta Semanal
            </span>
            <Target className="h-4 w-4 text-[#00F0FF]" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              {completedThisWeek}
            </span>
            <span className="text-gray-400 font-mono text-sm">/ {weeklyGoal} sessões</span>
          </div>
          {/* Mini Progress Bar */}
          <div className="w-full bg-[#1A1E26] h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-[#00F0FF] to-[#39FF14] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>

        {/* Total Time this week */}
        <Card glow="green" className="flex items-center gap-4 p-5">
          <div className="h-12 w-12 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-[#39FF14]" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              Tempo em Esforço
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-white">2h 45m</span>
              <span className="font-mono text-xs text-[#39FF14] font-semibold">ESTA SEMANA</span>
            </div>
          </div>
        </Card>

        {/* Evolution & Consistency */}
        <Card glow="purple" className="flex items-center gap-4 p-5">
          <div className="h-12 w-12 rounded-xl bg-[#7B2CBF]/10 border border-[#7B2CBF]/30 flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6 text-[#A855F7]" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              Índice de Carga
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-white">8.2</span>
              <span className="font-mono text-xs text-[#A855F7] font-semibold">RPE MÉDIO</span>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. Sport Filters & Categories */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-gray-300">
            Modalidades Esportivas
          </h2>
          <span className="text-xs font-mono text-gray-500">5 esportes ativos</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedSport('all')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
              selectedSport === 'all'
                ? 'bg-[#00F0FF] text-black border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                : 'bg-[#11141B] text-gray-400 border-[#232834] hover:text-white hover:border-gray-500'
            }`}
          >
            Todas ({recentSessions.length})
          </button>

          {SPORT_KEYS.map((key) => {
            const meta = sportMeta[key];
            const isSelected = selectedSport === key;
            const Icon = meta.icon;

            return (
              <button
                key={key}
                onClick={() => setSelectedSport(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1A1E26] text-white border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'bg-[#11141B] text-gray-400 border-[#232834] hover:text-white hover:border-gray-500'
                }`}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                <span>{meta.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Recent Sessions Feed */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-gray-300">
            Feed de Treinos Recentes
          </h2>
          <Link
            to="/sessions"
            className="text-xs font-mono text-[#00F0FF] hover:underline flex items-center gap-1 uppercase font-semibold"
          >
            Ver histórico completo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => {
              const meta = sportMeta[session.sportKey];
              const Icon = meta.icon;

              return (
                <Card
                  key={session.id}
                  interactive
                  className="flex flex-col justify-between p-5 hover:border-[#00F0FF]/40 transition-all group"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header: Sport badge & Timestamp */}
                    <div className="flex items-center justify-between">
                      <Badge variant={meta.badge} size="sm">
                        <Icon className="h-3 w-3 inline mr-1" />
                        {meta.name}
                      </Badge>
                      <span className="font-mono text-[11px] text-gray-400">{session.startedAt}</span>
                    </div>

                    {/* Session Title */}
                    <h3 className="font-sans text-base font-bold text-white group-hover:text-[#00F0FF] transition-colors line-clamp-1">
                      {session.title}
                    </h3>

                    {/* Primary Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-[#141822] rounded-lg p-2.5 border border-[#1E232E]">
                      {session.sportKey === 'running' && (
                        <>
                          <div>
                            <span className="font-mono text-[10px] text-gray-400 uppercase block">
                              Distância
                            </span>
                            <span className="font-display text-lg font-bold text-white">
                              {session.metrics.distanceKm} km
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-gray-400 uppercase block">
                              Pace Médio
                            </span>
                            <span className="font-display text-lg font-bold text-[#00F0FF]">
                              {formatPace(session.metrics.avgPaceSecKm)}
                            </span>
                          </div>
                        </>
                      )}

                      {session.sportKey === 'boxing' && (
                        <>
                          <div>
                            <span className="font-mono text-[10px] text-gray-400 uppercase block">
                              Rounds
                            </span>
                            <span className="font-display text-lg font-bold text-white">
                              {session.metrics.rounds} rounds
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-gray-400 uppercase block">
                              Golpes
                            </span>
                            <span className="font-display text-lg font-bold text-[#FF3366]">
                              {session.metrics.punchesThrown}
                            </span>
                          </div>
                        </>
                      )}

                      {session.sportKey === 'strength' && (
                        <>
                          <div>
                            <span className="font-mono text-[10px] text-gray-400 uppercase block">
                              Exercícios
                            </span>
                            <span className="font-display text-lg font-bold text-white">
                              {session.metrics.exercises}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-gray-400 uppercase block">
                              Volume
                            </span>
                            <span className="font-display text-lg font-bold text-[#A855F7]">
                              {(session.metrics.totalVolumeKg / 1000).toFixed(1)}k kg
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Duration & RPE */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1E232E] text-xs font-mono text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                      <span>{formatDuration(session.durationSeconds)}</span>
                    </div>

                    {session.rpe && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">RPE</span>
                        <span className="font-bold text-white bg-[#1A1E26] px-1.5 py-0.5 rounded text-[10px]">
                          {session.rpe}/10
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <Award className="h-10 w-10 text-gray-600" />
            <h3 className="font-sans font-bold text-gray-300">Nenhum treino registrado nesta categoria</h3>
            <p className="text-xs text-gray-500 font-mono max-w-sm">
              Grave uma nova sessão para começar a acompanhar seu ritmo e telemetria.
            </p>
            <Link to="/sessions/new">
              <Button variant="primary" size="sm" className="mt-2 font-mono">
                GRAVAR PRIMEIRO TREINO
              </Button>
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
};
