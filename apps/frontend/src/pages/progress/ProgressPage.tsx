import React from 'react';
import { Card } from '../../components/ui/Card';
import { TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const ProgressPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 font-sans max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Evolução & Telemetria
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Análise detalhada de consistência
          </p>
        </div>
        <Badge variant="purple" size="sm">BETA</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card variant="watch" className="p-8 bg-[#0D1C2D] border-[#1F2937] flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
          <TrendingUp className="h-12 w-12 text-[#A855F7] mb-2" />
          <h2 className="font-display text-xl font-bold text-[#D4E4FA] uppercase">
            Gráficos Avançados em Desenvolvimento
          </h2>
          <p className="font-mono text-xs text-[#8F9380] max-w-md">
            O motor de renderização de gráficos Recharts está sendo acoplado para exibir sua carga crônica (ACWR), distribuição de esportes e heatmap de consistência anual.
          </p>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5 border-[#1F2937] flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-[#5CA9E6]" />
              <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">Volume Trimestral</span>
            </div>
            <span className="font-display text-3xl font-bold text-[#D4E4FA]">84 h</span>
            <span className="font-mono text-[10px] text-[#D4F684] uppercase">+12% vs Tri anterior</span>
          </Card>
          
          <Card className="p-5 border-[#1F2937] flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-[#FF6B35]" />
              <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">Melhor Streak</span>
            </div>
            <span className="font-display text-3xl font-bold text-[#D4E4FA]">14 Dias</span>
            <span className="font-mono text-[10px] text-[#8F9380] uppercase">Alcançado em Julho</span>
          </Card>
        </div>
      </div>
    </div>
  );
};
