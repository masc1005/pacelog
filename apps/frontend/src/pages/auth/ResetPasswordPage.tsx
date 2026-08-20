import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Lock } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Link inválido ou expirado.');
      }
      navigate('/login', { state: { message: 'Senha redefinida com sucesso! Faça login.' } });
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1117] text-[#D4E4FA] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="path-line pointer-events-none" />

      <main className="w-full max-w-md relative z-10 flex flex-col gap-6">
        <header className="flex flex-col items-center text-center gap-3">
          <div className="font-mono text-sm tracking-[0.25em] text-[#D4F684] uppercase font-bold">PACELOG</div>
          <h1 className="font-display text-4xl font-bold text-[#D4E4FA] leading-tight">Nova Senha</h1>
          <p className="font-mono text-[11px] text-[#C5C8B4] uppercase tracking-widest">defina uma nova chave de acesso</p>
        </header>

        <Card className="p-6 bg-[#161C24] border-[#1F2937] w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-[#2B0D0D] border border-[#FFB4AB]/30 rounded-[2px] p-3 text-[#FFB4AB] font-mono text-xs">{error}</div>
            )}
            <Input
              label="Nova senha"
              type="password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
            <Input
              label="Confirmar senha"
              type="password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
            />
            <Button type="submit" variant="tactile" isLoading={isLoading} className="w-full tracking-widest">
              Confirmar Nova Senha
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};
