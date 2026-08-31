import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ExportDataModal } from './ExportDataModal';
import { ImportBackupModal } from './ImportBackupModal';
import { DeleteLocalDataModal } from './DeleteLocalDataModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { Download, UploadCloud, HardDrive, Trash2 } from 'lucide-react';

export const DataPrivacySection: React.FC = () => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearLocalModal, setShowClearLocalModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Dados, Privacidade e Backup
        </h2>
        <p className="font-mono text-xs text-[#8F9380] mt-0.5">
          Controle total sobre a exportação, importação e ciclo de vida de suas informações.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exportar Dados */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                Exportar Dados e Sessões
              </span>
              <span className="text-xs text-[#8F9380]">
                Baixe CSV para planilhas ou backup completo em JSON.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="w-full py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#38BDF8] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
          >
            Exportar Dados
          </button>
        </Card>

        {/* Importar / Restaurar Backup */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4F684]/15 border border-[#D4F684]/30 flex items-center justify-center text-[#D4F684]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                Restaurar Backup
              </span>
              <span className="text-xs text-[#8F9380]">
                Restaure arquivos de backup com mesclagem inteligente.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="w-full py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#D4F684] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
          >
            Importar Arquivo
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Limpar Armazenamento Local */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center text-[#FFB800]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                Cache e Dados Locais
              </span>
              <span className="text-xs text-[#8F9380]">
                Limpa armazenamento temporário e offline deste navegador.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowClearLocalModal(true)}
            className="w-full py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#FFB800] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
          >
            Limpar Cache Local
          </button>
        </Card>

        {/* Excluir Conta e Dados */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#FF3366] uppercase">
                Excluir Todos os Dados
              </span>
              <span className="text-xs text-[#8F9380]">
                Elimina permanentemente todo o histórico do atleta.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteAccountModal(true)}
            className="w-full py-2 px-3 bg-[#FF3366]/10 hover:bg-[#FF3366]/20 border border-[#FF3366]/30 text-[#FF3366] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
          >
            Excluir Conta
          </button>
        </Card>
      </div>

      {showExportModal && <ExportDataModal onClose={() => setShowExportModal(false)} />}
      {showImportModal && <ImportBackupModal onClose={() => setShowImportModal(false)} />}
      {showClearLocalModal && <DeleteLocalDataModal onClose={() => setShowClearLocalModal(false)} />}
      {showDeleteAccountModal && <DeleteAccountModal onClose={() => setShowDeleteAccountModal(false)} />}
    </div>
  );
};
