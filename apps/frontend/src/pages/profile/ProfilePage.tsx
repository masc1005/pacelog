import React from 'react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { User, Settings, LogOut, Download, Sliders, Ruler, Bell, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-12">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Perfil do Atleta
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1">
            Informações do perfil e atalhos rápidos de configurações
          </p>
        </div>

        <Link
          to="/settings"
          className="flex items-center gap-1.5 py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#D4F684] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configurações
        </Link>
      </div>

      <Card variant="watch" className="p-6 bg-[#0D1C2D] border-[#1F2937] flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[#161C24] border-2 border-[#1F2937] flex items-center justify-center">
          <User className="h-8 w-8 text-[#5CA9E6]" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-xl font-bold text-[#D4E4FA] uppercase">{user?.name}</span>
          <span className="font-mono text-xs text-[#8F9380]">{user?.email}</span>
          <span className="font-mono text-[10px] bg-[#161C24] text-[#D4F684] px-2 py-0.5 rounded-[2px] w-fit mt-2 border border-[#1F2937]">
            PACELOG PRO
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <h2 className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest mt-2">
          Central de Preferências & Ajustes
        </h2>

        <Card className="flex flex-col border-[#1F2937] divide-y divide-[#1F2937]">
          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Ruler className="h-4 w-4 text-[#38BDF8]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Unidades e Fuso Horário</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Km/Milhas, Kg/Libras, formato 24h
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>

          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sliders className="h-4 w-4 text-[#D4F684]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Esportes & Métricas</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Modalidades ativas e personalização de campos
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>

          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-[#FFB800]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Lembretes de Treino</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Programação semanal e notificações
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>

          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-[#10B981]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Backup e Exportação</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Download de planilhas CSV, JSON e restauração
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>
        </Card>
      </div>

      <div className="mt-6">
        <Button 
          variant="secondary" 
          className="w-full text-[#FFB4AB] border-[#FFB4AB]/20 hover:bg-[#FFB4AB]/10 hover:border-[#FFB4AB]"
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={signOut}
        >
          ENCERRAR SESSÃO
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
