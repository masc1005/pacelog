import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { User, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe seu nome ou apelido de atleta.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Preencha e-mail e chave de acesso.');
      return;
    }

    if (password.length < 8) {
      setError('A chave de acesso deve conter ao menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUp(name.trim(), email.trim(), password);
      if (res.error) {
        setError(res.error);
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      setError('Erro de conexão ao criar sua conta. Verifique sua rede e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1117] text-[#D4E4FA] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Ambient Path Line from Stitch */}
      <div className="path-line pointer-events-none" />

      <main className="w-full max-w-md relative z-10 flex flex-col gap-6">
        {/* Header Navigation & Step indicator from Stitch */}
        <header className="flex items-center justify-between z-10 w-full mb-2">
          <Link
            to="/login"
            className="text-[#D4E4FA] hover:text-[#D4F684] transition-colors flex items-center gap-1 text-xs font-mono"
          >
            ← Voltar
          </Link>
          <div className="font-mono text-[11px] text-[#C5C8B4] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full animate-pulse"></span>
            COMEÇO / 01
          </div>
        </header>

        {/* Title Section matching Stitch Criar Registro */}
        <section className="text-center sm:text-left">
          <span className="font-mono text-[11px] text-[#8F9380] uppercase mb-1 block tracking-widest">
            REGISTRO_NOVO
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#D4E4FA] leading-tight lowercase">
            comece a<br />deixar rastros
          </h1>
          <p className="font-sans text-xs text-[#C5C8B4] mt-2 lowercase">
            crie sua conta de atleta e centralize seus 5 esportes.
          </p>
        </section>

        {/* Form Module with Corner Ticks */}
        <Card
          variant="module"
          cornerTagTopLeft="NOVO_ATLETA"
          cornerTagBottomRight="SYNC:ON"
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
              id="register-name"
              label="Nome do Atleta"
              placeholder="Ex: Leoni Mascarenhas"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
              disabled={isLoading}
              required
            />

            <Input
              id="register-email"
              label="Email de Acesso"
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
              id="register-password"
              label="Chave de Segurança (Min. 8 dígitos)"
              isPassword
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
              required
            />

            <Input
              id="register-confirm-password"
              label="Confirmar Chave de Segurança"
              isPassword
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              variant="tactile"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-3 font-display tracking-widest"
            >
              CRIAR CONTA & ENTRAR
            </Button>
          </form>
        </Card>

        {/* Footer Link to Login matching Stitch */}
        <footer className="text-center pt-2">
          <Link
            to="/login"
            className="font-mono text-xs text-[#8F9380] hover:text-[#D4F684] transition-colors uppercase tracking-widest inline-flex items-center gap-1.5"
          >
            já tem registro?{' '}
            <span className="text-[#D4F684] border-b border-[#D4F684]/40 pb-0.5 font-bold">
              autenticar sessão
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
