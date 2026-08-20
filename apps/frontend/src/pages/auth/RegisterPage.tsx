import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Activity, Lock, Mail, User, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

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

    if (!name.trim() || !email.trim() || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres para segurança.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A confirmação de senha não coincide com a senha digitada.');
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
      setError('Erro ao criar conta. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#00F0FF]/30 selection:text-[#00F0FF]">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E232E_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#39FF14]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-[#00F0FF] to-[#39FF14] p-0.5 shadow-[0_0_30px_rgba(57,255,20,0.3)] mb-4">
            <div className="h-full w-full bg-[#08090C] rounded-[14px] flex items-center justify-center">
              <Activity className="h-7 w-7 text-[#39FF14]" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white uppercase">
            PACELOG
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-[#39FF14] mt-1">
            CADASTRO OFICIAL DE ATLETA
          </p>
        </div>

        {/* Register Card */}
        <Card glow="green" className="p-6 sm:p-8 backdrop-blur-xl bg-[#0E1117]/95">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1E232E]">
            <div>
              <h2 className="text-lg font-bold text-white font-sans">Novo Perfil</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Telemetria multiesportiva</p>
            </div>
            <Badge variant="green" size="sm">
              REGISTRO GRÁTIS
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
              id="register-name"
              label="Nome Completo / Apelido"
              type="text"
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
              id="register-password"
              label="Senha de Acesso"
              isPassword
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
              helperText={password.length >= 8 ? undefined : 'Pelo menos 8 caracteres'}
              required
            />

            <Input
              id="register-confirm-password"
              label="Confirmar Senha"
              isPassword
              placeholder="Repita sua senha"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
              required
            />

            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 pt-1">
              <CheckCircle2 className="h-4 w-4 text-[#39FF14] shrink-0" />
              <span>Suporte a Corrida, Boxe, Força, Futevôlei e Futebol</span>
            </div>

            <Button
              type="submit"
              variant="glow"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-3 font-mono font-bold tracking-widest"
            >
              CRIAR CONTA DE ATLETA
            </Button>
          </form>

          {/* Footer Link to Login */}
          <div className="mt-8 pt-6 border-t border-[#1E232E] text-center text-xs font-mono text-gray-400">
            <span>Já possui conta cadastrada? </span>
            <Link
              to="/login"
              className="text-[#39FF14] hover:underline font-bold transition-colors ml-1 uppercase"
            >
              Acessar Login →
            </Link>
          </div>
        </Card>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-[11px] font-mono text-gray-500">
          <ShieldCheck className="h-4 w-4 text-[#00F0FF]" />
          <span>Seus dados esportivos criptografados e protegidos</span>
        </div>
      </div>
    </div>
  );
};
