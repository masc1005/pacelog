import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Download, FileSpreadsheet, FileJson, Database, X } from 'lucide-react';

interface ExportDataModalProps {
  onClose: () => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleDownload = async (type: 'csv' | 'json' | 'backup') => {
    setIsExporting(type);
    try {
      let url = '/api/export/sessions.csv';
      let filename = 'pacelog-sessoes.csv';

      if (type === 'json') {
        url = '/api/export/sessions.json';
        filename = 'pacelog-sessoes.json';
      } else if (type === 'backup') {
        url = '/api/export/backup.json';
        filename = `pacelog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pacelog_token') || ''}`,
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Falha no download');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      addToast('Download iniciado com sucesso', 'success');
    } catch {
      addToast('Erro ao exportar dados', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0D1C2D] border border-[#1F2937] p-6 rounded-xl max-w-md w-full flex flex-col gap-5 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
              Exportar Telemetrias e Dados
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8F9380] hover:text-[#D4E4FA] text-lg leading-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#8F9380]">
          Baixe cópias dos seus treinos e registros para análise em planilhas ou backup completo.
        </p>

        <div className="flex flex-col gap-3">
          {/* Sessões CSV */}
          <button
            type="button"
            disabled={isExporting !== null}
            onClick={() => handleDownload('csv')}
            className="p-3.5 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold text-[#D4E4FA]">
                  Sessões em Planilha (CSV)
                </span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Compatível com Excel, Google Sheets e Numbers
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#8F9380]" />
          </button>

          {/* Sessões JSON */}
          <button
            type="button"
            disabled={isExporting !== null}
            onClick={() => handleDownload('json')}
            className="p-3.5 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center">
                <FileJson className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold text-[#D4E4FA]">
                  Sessões em Formato JSON
                </span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Dados estruturados com métricas brutas
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#8F9380]" />
          </button>

          {/* Backup Completo */}
          <button
            type="button"
            disabled={isExporting !== null}
            onClick={() => handleDownload('backup')}
            className="p-3.5 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#D4F684]/15 text-[#D4F684] flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold text-[#D4E4FA]">
                  Backup Completo (.json)
                </span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Perfil, metas, tênis, configurações e histórico
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#8F9380]" />
          </button>
        </div>

        <button
          type="button"
          className="w-full py-2.5 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors mt-1"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
