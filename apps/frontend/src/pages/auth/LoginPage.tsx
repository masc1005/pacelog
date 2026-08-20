import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

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
      setError('Por favor, informe seu e-mail e chave de acesso.');
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
    <div className="min-h-screen bg-[#0B1117] text-[#D4E4FA] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Ambient Path Line from Stitch */}
      <div className="path-line pointer-events-none" />

      <main className="w-full max-w-md relative z-10 flex flex-col gap-6">
        {/* Header Section from Stitch */}
        <header className="flex flex-col items-center text-center gap-3">
          <div className="font-mono text-sm tracking-[0.25em] text-[#D4F684] uppercase font-bold">
            PACELOG
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[11px] text-[#C5C8B4] uppercase tracking-widest">
              registre o esforço. enxergue a evolução.
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#D4E4FA] leading-tight lowercase">
              volte para o seu ritmo
            </h1>
            <p className="font-sans text-xs text-[#8F9380] lowercase">
              seus treinos, suas marcas, sua história.
            </p>
          </div>
        </header>

        {/* Form Module with Corner Ticks & Tags matching Stitch */}
        <Card
          variant="module"
          cornerTagTopLeft="SESSÃO_001"
          cornerTagBottomRight="AUTH:SECURE"
          className="p-6 sm:p-8 bg-[#161C24]"
        >
          {error && (
            <div className="mb-6 p-3 rounded-[2px] bg-[#FFB4AB]/10 border border-[#FFB4AB]/30 text-[#FFB4AB] text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
            <Input
              id="login-email"
              label="Email de acesso"
              errorCode={error ? '[ERR:01]' : undefined}
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
              label="Chave de segurança"
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
              <label className="flex items-center gap-2 text-[#8F9380] hover:text-[#D4E4FA] cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded-[2px] bg-[#0D1C2D] border-[#1F2937] text-[#D4F684] focus:ring-[#D4F684] h-3.5 w-3.5"
                />
                <span className="text-[11px]">Lembrar credenciais</span>
              </label>

              <span className="text-[11px] text-[#4D5767] hover:text-[#8F9380] transition-colors cursor-not-allowed">
                Esqueceu a chave?
              </span>
            </div>

            <Button
              type="submit"
              variant="tactile"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-3 font-display tracking-widest"
            >
              AUTENTICAR SESSÃO
            </Button>
          </form>
        </Card>

        {/* Footer Link to Register matching Stitch */}
        <footer className="text-center pt-2">
          <Link
            to="/register"
            className="font-mono text-xs text-[#8F9380] hover:text-[#D4F684] transition-colors uppercase tracking-widest inline-flex items-center gap-1.5"
          >
            ainda não começou?{' '}
            <span className="text-[#D4F684] border-b border-[#D4F684]/40 pb-0.5 font-bold">
              criar registro
            </span>
          </Link>
        </footer>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-mono text-[#8F9380]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#D4F684]" />
          <span>Isolamento multi-tenant & conformidade estrita LGPD</span>
        </div>
      </main>
    </div>
  );
};
