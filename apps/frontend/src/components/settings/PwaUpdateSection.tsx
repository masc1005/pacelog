import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { useServiceWorker } from '../../pwa/hooks/useServiceWorker';
import { Smartphone, RefreshCw, CheckCircle2, Wifi, Download } from 'lucide-react';

export const PwaUpdateSection: React.FC = () => {
  const { addToast } = useToast();
  const { isInstalled, updateAvailable, applyUpdate } = useServiceWorker();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      }
      setTimeout(() => {
        if (!updateAvailable) {
          addToast('O PACELOG está atualizado na versão mais recente!', 'success');
        }
        setIsChecking(false);
      }, 700);
    } catch {
      addToast('Não foi possível verificar atualizações no momento', 'error');
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Aplicativo e Atualizações
        </h2>
        <p className="font-mono text-xs text-[#8F9380] mt-0.5">
          Informações de versão e suporte para funcionamento offline PWA.
        </p>
      </div>

      {/* Atualização disponível */}
      {updateAvailable && (
        <Card className="p-4 bg-[#1A2A1A] border border-[#D4F684]/30 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-[#D4F684] uppercase font-bold">
              Nova versão disponível
            </span>
            <span className="font-mono text-xs text-[#8F9380]">
              Aplique a atualização para usar os recursos mais recentes.
            </span>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="flex items-center gap-1.5 py-2 px-3 bg-[#D4F684] text-[#051424] font-mono text-xs uppercase font-bold tracking-wider rounded-[4px] hover:bg-[#C4E574] transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Atualizar agora
          </button>
        </Card>
      )}

      <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4F684]/15 border border-[#D4F684]/30 flex items-center justify-center text-[#D4F684]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                PACELOG Sports Telemetry
              </span>
              <span className="font-mono text-xs text-[#8F9380]">Versão 2.5.0 (Build 2026.08)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#161C24] px-3 py-1.5 rounded-full border border-[#1F2937]">
            <CheckCircle2 className={`w-4 h-4 ${isInstalled ? 'text-[#10B981]' : 'text-[#8F9380]'}`} />
            <span className="font-mono text-[10px] text-[#D4E4FA] uppercase">
              {isInstalled ? 'Instalado / PWA' : 'Modo web'}
            </span>
          </div>
        </div>

        <div className="p-3 bg-[#161C24] border border-[#1F2937] rounded-lg flex items-center justify-between text-xs text-[#8F9380]">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#38BDF8]" />
            <span>Suporte a registro de sessões offline e sincronização automática</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]">
          <span className="font-mono text-[11px] text-[#8F9380]">
            Última checagem: Hoje às {new Date().toLocaleTimeString().slice(0, 5)}
          </span>
          <button
            type="button"
            disabled={isChecking}
            onClick={handleCheckUpdate}
            className="flex items-center gap-1.5 py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#D4E4FA] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-[#D4F684]' : ''}`} />
            {isChecking ? 'Verificando…' : 'Verificar Atualizações'}
          </button>
        </div>
      </Card>
    </div>
  );
};
