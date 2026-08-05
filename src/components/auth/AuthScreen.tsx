import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, CircleAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
  };

  return (
    <div className="card-premium p-6 space-y-6 max-w-md mx-auto w-full animate-appear">
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold font-albert-sans text-neutral-11">
          {mode === 'login' ? 'Entrar na sua conta' : 'Criar sua conta'}
        </h3>
        <p className="text-xs text-neutral-08">
          {mode === 'login'
            ? 'Entre com e-mail e senha para acessar suas anotações.'
            : 'Cadastre-se com e-mail e senha para começar a salvar suas anotações.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor="auth-email" className="text-sm font-semibold text-neutral-10 block">E-mail</label>
          <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
              <Mail size={18} />
            </span>
            <input
              id="auth-email"
              type="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full pl-12 pr-4 py-3 bg-transparent text-neutral-11 focus:outline-none placeholder-neutral-06"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor="auth-password" className="text-sm font-semibold text-neutral-10 block">Senha</label>
          <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
              <Lock size={18} />
            </span>
            <input
              id="auth-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full pl-12 pr-4 py-3 bg-transparent text-neutral-11 focus:outline-none placeholder-neutral-06"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <CircleAlert size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-filled w-full text-sm py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-neutral-00 border-t-transparent rounded-full animate-spin" />
          ) : mode === 'login' ? (
            <LogIn size={16} />
          ) : (
            <UserPlus size={16} />
          )}
          {isSubmitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>

      <button
        onClick={toggleMode}
        className="w-full text-center text-xs text-neutral-08 hover:text-neutral-11 transition-colors"
      >
        {mode === 'login' ? (
          <>Não tem conta? <span className="font-semibold text-neutral-11">Cadastre-se</span></>
        ) : (
          <>Já tem conta? <span className="font-semibold text-neutral-11">Entrar</span></>
        )}
      </button>
    </div>
  );
};
