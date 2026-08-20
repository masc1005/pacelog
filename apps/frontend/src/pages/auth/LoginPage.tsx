import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Activity, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Por favor, informe e-mail e senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn(email.trim(), password);
      if (res.error) {
        setError(res.error);
      } else {
        navigate(from, { replace: true });
      }
    } catch {
      setError('Erro de conexão ao autenticar. Verifique sua rede e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#00F0FF]/30 selection:text-[#00F0FF]">
      {/* Background Decorative Tactical Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E232E_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-[#00F0FF] to-[#39FF14] p-0.5 shadow-[0_0_30px_rgba(0,240,255,0.3)] mb-4">
            <div className="h-full w-full bg-[#08090C] rounded-[14px] flex items-center justify-center">
              <Activity className="h-7 w-7 text-[#00F0FF]" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white uppercase">
            PACELOG
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-[#00F0FF] mt-1">
            PRECISION MULTI-SPORT TRACKER
          </p>
        </div>

        {/* Login Card */}
        <Card glow="cyan" className="p-6 sm:p-8 backdrop-blur-xl bg-[#0E1117]/95">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1E232E]">
            <div>
              <h2 className="text-lg font-bold text-white font-sans">Acesso do Atleta</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Credenciais de telemetria</p>
            </div>
            <Badge variant="cyan" size="sm">
              SESSÃO SEGURA
            </Badge>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-[#FF3366]/10 border border-[#FF3366]/30 text-[#FF3366] text-xs font-sans flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="login-email"
              label="E-mail"
              type="email"
              placeholder="atleta@pacelog.app"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={isLoading}
              required
            />

            <Input
              id="login-password"
              label="Senha de Acesso"
              isPassword
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
              required
            />

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <label className="flex items-center gap-2 text-gray-400 hover:text-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded bg-[#1A1E26] border-[#2B3242] text-[#00F0FF] focus:ring-[#00F0FF] h-3.5 w-3.5"
                />
                <span>Lembrar credenciais</span>
              </label>

              <span className="text-gray-600 hover:text-gray-400 transition-colors cursor-not-allowed">
                Esqueceu a senha?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-3 font-mono font-bold tracking-widest"
            >
              AUTENTICAR SESSÃO
            </Button>
          </form>

          {/* Footer Link to Register */}
          <div className="mt-8 pt-6 border-t border-[#1E232E] text-center text-xs font-mono text-gray-400">
            <span>Novo no PaceLog? </span>
            <Link
              to="/register"
              className="text-[#00F0FF] hover:underline font-bold transition-colors ml-1 uppercase"
            >
              Criar Conta de Atleta →
            </Link>
          </div>
        </Card>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-[11px] font-mono text-gray-500">
          <ShieldCheck className="h-4 w-4 text-[#39FF14]" />
          <span>Isolamento estrito multi-tenant & conformidade LGPD</span>
        </div>
      </div>
    </div>
  );
};
