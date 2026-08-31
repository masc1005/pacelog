import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../lib/api';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ImportBackupModalProps {
  onClose: () => void;
}

export const ImportBackupModal: React.FC<ImportBackupModalProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const [fileContent, setFileContent] = useState<any | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setFileContent(parsed);
      } catch {
        addToast('Arquivo JSON inválido ou corrompido', 'error');
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileContent) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient<{
        success: boolean;
        mode: string;
        imported: {
          sessions: number;
          goals: number;
          shoes: number;
          settingsUpdated: boolean;
        };
      }>('/api/export/import', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          data: fileContent,
        }),
      });

      setResult(response);
      addToast('Backup importado com sucesso!', 'success');
    } catch {
      addToast('Erro ao importar backup', 'error');
    } finally {
      setIsSubmitting(false);
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
            <div className="w-8 h-8 rounded-lg bg-[#D4F684]/15 border border-[#D4F684]/30 flex items-center justify-center text-[#D4F684]">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
              Restaurar / Importar Backup
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

        {result ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3 p-4 bg-[#10B981]/15 border border-[#10B981]/30 rounded-xl text-[#10B981]">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold uppercase">
                  Restauração Concluída
                </span>
                <span className="text-xs text-[#D4E4FA]/80">
                  Os dados foram integrados à sua conta com sucesso.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#161C24] p-3 rounded-lg border border-[#1F2937] text-center">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Sessões</span>
                <p className="font-display text-base font-bold text-[#D4F684]">
                  {result.imported?.sessions ?? 0}
                </p>
              </div>
              <div className="bg-[#161C24] p-3 rounded-lg border border-[#1F2937] text-center">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Metas</span>
                <p className="font-display text-base font-bold text-[#38BDF8]">
                  {result.imported?.goals ?? 0}
                </p>
              </div>
              <div className="bg-[#161C24] p-3 rounded-lg border border-[#1F2937] text-center">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Tênis</span>
                <p className="font-display text-base font-bold text-[#FFB800]">
                  {result.imported?.shoes ?? 0}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-[#D4F684] text-[#051424] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all mt-2"
            >
              Concluir
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Seletor de Arquivo */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
                Arquivo de Backup (.json)
              </label>
              <label className="border-2 border-dashed border-[#1F2937] hover:border-[#D4F684]/60 bg-[#161C24] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                <FileText className="w-8 h-8 text-[#8F9380]" />
                <span className="font-mono text-xs text-[#D4E4FA]">
                  {fileName || 'Clique para selecionar o arquivo JSON'}
                </span>
                <span className="text-[10px] text-[#8F9380]">
                  Apenas backups exportados pelo PACELOG
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {fileContent && (
              <>
                {/* Modo de Importação */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
                    Modo de Integração
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('merge')}
                      className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        mode === 'merge'
                          ? 'bg-[#161C24] border-[#D4F684] text-[#D4F684]'
                          : 'bg-[#051424] border-[#1F2937] text-[#8F9380]'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold uppercase">Mesclar (Merge)</span>
                      <span className="text-[10px] text-[#8F9380]">
                        Mantém histórico atual e adiciona novos
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('replace')}
                      className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        mode === 'replace'
                          ? 'bg-[#161C24] border-[#FF3366] text-[#FF3366]'
                          : 'bg-[#051424] border-[#1F2937] text-[#8F9380]'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold uppercase">Substituir</span>
                      <span className="text-[10px] text-[#8F9380]">
                        Apaga dados atuais antes de importar
                      </span>
                    </button>
                  </div>
                </div>

                {mode === 'replace' && (
                  <div className="p-3 bg-[#FF3366]/10 border border-[#FF3366]/30 rounded-lg flex items-center gap-2 text-xs text-[#FF3366]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Atenção: Os dados atuais serão substituídos pelo arquivo.</span>
                  </div>
                )}
              </>
            )}

            {/* Botões */}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                className="flex-1 py-2.5 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!fileContent || isSubmitting}
                className="flex-1 py-2.5 px-3 bg-[#D4F684] text-[#051424] hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(212,246,132,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Importando…' : 'Iniciar Importação'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
