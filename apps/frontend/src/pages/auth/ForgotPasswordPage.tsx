import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Informe seu e-mail cadastrado.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await fetch(`${API_BASE_URL}/api/auth/forget-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), redirectTo: `${window.location.origin}/reset-password` }),
      });
      setSent(true);
    } catch {
      setError('Erro de conexão. Tente novamente.');
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
          <h1 className="font-display text-4xl font-bold text-[#D4E4FA] leading-tight">
            {sent ? 'Link Enviado' : 'Recuperar Acesso'}
          </h1>
          <p className="font-mono text-[11px] text-[#C5C8B4] uppercase tracking-widest">
            {sent ? 'verifique sua caixa de entrada' : 'informe o e-mail vinculado à sua conta'}
          </p>
        </header>

        <Card className="p-6 bg-[#161C24] border-[#1F2937] w-full">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-[#D4F684]" />
              <p className="font-sans text-sm text-[#C5C8B4]">
                Se o e-mail <span className="text-[#D4E4FA] font-semibold">{email}</span> estiver cadastrado, você receberá um link de redefinição em breve.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="bg-[#2B0D0D] border border-[#FFB4AB]/30 rounded-[2px] p-3 text-[#FFB4AB] font-mono text-xs">
                  {error}
                </div>
              )}
              <Input
                label="E-mail cadastrado"
                type="email"
                leftIcon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="atleta@email.com"
                autoComplete="email"
              />
              <Button type="submit" variant="tactile" isLoading={isLoading} className="w-full tracking-widest">
                Enviar Link de Recuperação
              </Button>
            </form>
          )}
        </Card>

        <Link to="/login" className="flex items-center justify-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o login
        </Link>
      </main>
    </div>
  );
};
