import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { ChangeEmailModal } from './ChangeEmailModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { User, Mail, KeyRound, ShieldAlert, LogOut } from 'lucide-react';

export const AccountSettingsSection: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Conta e Segurança
        </h2>
        <p className="font-mono text-xs text-[#8F9380] mt-0.5">
          Gerencie seu e-mail de acesso, credenciais e segurança da conta.
        </p>
      </div>

      {/* Cartão de Perfil da Conta */}
      <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#D4F684] font-display text-lg font-bold">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : <User className="w-6 h-6" />}
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base font-bold text-[#D4E4FA]">
              {user?.name || 'Atleta PACELOG'}
            </span>
            <span className="font-mono text-xs text-[#8F9380]">{user?.email}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-2 py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#FF6B35] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Encerrar Sessão
        </button>
      </Card>

      {/* Ações de Segurança */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alterar E-mail */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#5CA9E6]/15 border border-[#5CA9E6]/30 flex items-center justify-center text-[#5CA9E6]">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                E-mail de Acesso
              </span>
              <span className="text-xs text-[#8F9380]">{user?.email}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="w-full py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#D4E4FA] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
          >
            Alterar E-mail
          </button>
        </Card>

        {/* Alterar Senha */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center text-[#FFB800]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                Senha de Acesso
              </span>
              <span className="text-xs text-[#8F9380]">Protegida com hash criptográfico</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#D4E4FA] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
          >
            Alterar Senha
          </button>
        </Card>
      </div>

      {/* Zona de Perigo - Exclusão */}
      <Card className="p-5 bg-[#0D1C2D] border border-[#FF3366]/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366] flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-[#FF3366] uppercase">
              Excluir Conta e Histórico
            </span>
            <span className="text-xs text-[#8F9380]">
              Remove permanentemente sua conta, sessões, métricas e dados de telemetria.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="py-2.5 px-4 bg-[#FF3366]/10 hover:bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors flex-shrink-0"
        >
          Excluir Conta
        </button>
      </Card>

      {showEmailModal && <ChangeEmailModal onClose={() => setShowEmailModal(false)} />}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
    </div>
  );
};
