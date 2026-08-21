import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import type { AIInsightDTO } from '@pacelog/shared';
import { Sparkles, ArrowRight, BrainCircuit, LineChart, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<AIInsightDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      try {
        const data = await apiClient<AIInsightDTO[]>('/api/insights');
        setInsights(data);
      } catch (err) {
        console.error('Falha ao carregar insights', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInsights();
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'session_analysis': return <LineChart className="h-5 w-5 text-[#5CA9E6]" />;
      case 'daily_coach': return <BrainCircuit className="h-5 w-5 text-[#A855F7]" />;
      case 'milestone_celebration': return <Target className="h-5 w-5 text-[#D4F684]" />;
      default: return <Sparkles className="h-5 w-5 text-[#FF6B35]" />;
    }
  };

  const getTitleForType = (type: string) => {
    switch (type) {
      case 'session_analysis': return 'Análise Tática de Sessão';
      case 'daily_coach': return 'Coach Diário';
      case 'milestone_celebration': return 'Marco Alcançado';
      case 'recovery_warning': return 'Alerta de Recuperação';
      default: return 'Insight de IA';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'session_analysis': return 'cyan';
      case 'daily_coach': return 'purple';
      case 'milestone_celebration': return 'sage';
      case 'recovery_warning': return 'crimson';
      default: return 'neutral';
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-3xl mx-auto w-full pb-20">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#A855F7]" />
            Inteligência
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Histórico de análises e recomendações do seu Coach Virtual
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="font-mono text-xs text-[#8F9380] animate-pulse">Consultando cérebro neural...</div>
        </div>
      ) : insights.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center gap-3 border-dashed border-[#454839]">
          <BrainCircuit className="h-8 w-8 text-[#8F9380]" />
          <span className="font-mono text-sm text-[#C5C8B4] uppercase text-center max-w-sm">
            Nenhum insight gerado ainda. Registre treinos para receber análises táticas.
          </span>
        </Card>
      ) : (
        <div className="flex flex-col gap-4 relative">
          {/* Timeline track */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-[#1F2937] z-0 hidden sm:block"></div>

          {insights.map(insight => (
            <div key={insight.id} className="relative z-10 flex gap-4 sm:gap-6 group">
              <div className="hidden sm:flex flex-col items-center pt-2">
                <div className="w-14 h-14 rounded-full bg-[#051424] border-2 border-[#1F2937] flex items-center justify-center group-hover:border-[#A855F7] transition-colors">
                  {getIconForType(insight.type)}
                </div>
              </div>
              
              <Card className="flex-1 p-5 bg-[#0D1C2D] border-[#1F2937] hover:border-[#454839] transition-colors flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-[#D4E4FA]">
                        {getTitleForType(insight.type)}
                      </span>
                      <Badge variant={getBadgeVariant(insight.type)} size="sm">
                        {new Date(insight.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </Badge>
                    </div>
                  </div>
                  
                  {insight.sessionId && (
                    <Link to={`/sessions/${insight.sessionId}`}>
                      <div className="p-2 rounded-full hover:bg-[#161C24] transition-colors group/btn">
                        <ArrowRight className="h-4 w-4 text-[#8F9380] group-hover/btn:text-[#5CA9E6]" />
                      </div>
                    </Link>
                  )}
                </div>

                <div className="text-sm text-[#C5C8B4] leading-relaxed font-sans mt-1">
                  {insight.content}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
