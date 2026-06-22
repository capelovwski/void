import React, { useState } from 'react';
import { User, LogIn, LogOut, HelpCircle, Moon, Sun, Shield, BookOpen, Layers, PiggyBank, CircleAlert } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

interface PerfilTabProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  user: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export const PerfilTab: React.FC<PerfilTabProps> = ({
  theme,
  setTheme,
  user,
  onLogin,
  onLogout,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [openTutorialSection, setOpenTutorialSection] = useState<string | null>('balances');

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin({
        name: 'Pedro Silva',
        email: 'pedro.silva@gmail.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256',
      });
      setIsLoggingIn(false);
    }, 1200);
  };

  const toggleSection = (section: string) => {
    setOpenTutorialSection(openTutorialSection === section ? null : section);
  };

  return (
    <div className="space-y-6 pb-24 animate-appear max-w-5xl mx-auto w-full">
      
      {/* Page Title Header */}
      <div className="bg-neutral-00 p-6 rounded-2xl border border-neutral-03/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-albert-sans text-neutral-11 flex items-center gap-2">
            <User size={20} className="text-neutral-08" />
            Perfil & Configurações
          </h2>
          <p className="text-xs text-neutral-08 mt-1">Gerencie sua conta Void, tema visual e consulte a central de ajuda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 desktop:grid-cols-3 gap-6">
        
        {/* Left Columns (takes 2 cols): Account & Theme */}
        <div className="desktop:col-span-2 space-y-6">
          
          {/* Account Profile Card */}
          <div className="card-premium p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-02 pb-3">
              <Shield className="text-neutral-08" size={18} />
              <h3 className="text-base font-bold font-albert-sans text-neutral-11">Identidade & Acesso</h3>
            </div>

            {user ? (
              // Connected State
              <div className="flex flex-col tablet:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-01 border border-neutral-02">
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-14 h-14 rounded-full border-2 border-main object-cover"
                  />
                  <div className="text-center tablet:text-left">
                    <h4 className="text-sm font-bold text-neutral-11">{user.name}</h4>
                    <p className="text-xs text-neutral-08">{user.email}</p>
                    <span className="inline-block text-[9px] bg-success/20 text-success border border-success/30 px-2 py-0.5 rounded-full font-bold mt-1">
                      Conectado via Google
                    </span>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="btn-outline px-4 py-2.5 text-xs rounded-xl flex items-center gap-2 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
                >
                  <LogOut size={14} />
                  Desconectar Conta
                </button>
              </div>
            ) : (
              // Disconnected State
              <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-neutral-01/50 border border-dashed border-neutral-03/80 space-y-4">
                <div className="p-4 rounded-full bg-neutral-02 text-neutral-08">
                  <User size={32} />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-neutral-11">Sincronize seus dados na Nuvem</h4>
                  <p className="text-xs text-neutral-08">
                    Faça login com sua Conta Google para salvar suas transações e metas de forma segura.
                  </p>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="btn-filled text-xs px-6 py-3 rounded-xl flex items-center gap-2"
                >
                  {isLoggingIn ? (
                    <span className="w-4 h-4 border-2 border-neutral-00 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogIn size={15} />
                  )}
                  {isLoggingIn ? 'Conectando ao Google...' : 'Fazer login com o Google'}
                </button>
              </div>
            )}
          </div>

          {/* Theme Visual Selector Card */}
          <div className="card-premium p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-02 pb-3">
              <Sun className="text-neutral-08" size={18} />
              <h3 className="text-base font-bold font-albert-sans text-neutral-11">Tema do Void</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Option Dark Mode */}
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-main bg-main/5 ring-1 ring-main'
                    : 'border-neutral-02 bg-neutral-01/40 hover:bg-neutral-02/60 text-neutral-08 hover:text-neutral-10'
                }`}
              >
                <Moon size={20} className={theme === 'dark' ? 'text-main' : ''} />
                <span className="text-xs font-semibold text-neutral-11">Modo Noturno (Padrão)</span>
              </button>

              {/* Option Light Mode */}
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-neutral-12 bg-neutral-12/5 ring-1 ring-neutral-12'
                    : 'border-neutral-02 bg-neutral-01/40 hover:bg-neutral-02/60 text-neutral-08 hover:text-neutral-10'
                }`}
              >
                <Sun size={20} className={theme === 'light' ? 'text-neutral-12' : ''} />
                <span className="text-xs font-semibold text-neutral-11">Modo Claro</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Help Center */}
        <div className="card-premium p-6 space-y-6 flex flex-col">
          <div className="flex items-center gap-2 border-b border-neutral-02 pb-3">
            <HelpCircle className="text-neutral-08" size={18} />
            <h3 className="text-base font-bold font-albert-sans text-neutral-11">Como Usar o Void</h3>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            
            {/* Topic 1: Cascading balances */}
            <div className="border border-neutral-02 rounded-xl overflow-hidden bg-neutral-01/30">
              <button
                onClick={() => toggleSection('balances')}
                className="w-full p-3 text-left flex items-center justify-between bg-neutral-01/60 hover:bg-neutral-02/40 transition-colors"
              >
                <span className="text-xs font-bold text-neutral-11 flex items-center gap-2">
                  <BookOpen size={14} className="text-neutral-08" />
                  Mecânica de Saldos Diários
                </span>
                <span className="text-neutral-06 text-xs">{openTutorialSection === 'balances' ? '−' : '+'}</span>
              </button>
              
              {openTutorialSection === 'balances' && (
                <div className="p-3 text-[11px] text-neutral-08 leading-relaxed space-y-2 border-t border-neutral-02">
                  <p>
                    O Void calcula o saldo projetado de sua carteira <strong>dia a dia</strong> em cascata contínua.
                  </p>
                  <p>
                    Para datas no <strong>passado e hoje</strong>, o sistema desconta os <strong>Gastos Reais</strong> anotados por você. Se não anotado, assume-se R$ 0.
                  </p>
                  <p>
                    Para datas no <strong>futuro</strong>, desconta-se o seu <strong>Gasto Diário Base</strong> simulado (Receita − Gastos Fixos dividido pelos dias do mês).
                  </p>
                </div>
              )}
            </div>

            {/* Topic 2: Health map color guide */}
            <div className="border border-neutral-02 rounded-xl overflow-hidden bg-neutral-01/30">
              <button
                onClick={() => toggleSection('heatmap')}
                className="w-full p-3 text-left flex items-center justify-between bg-neutral-01/60 hover:bg-neutral-02/40 transition-colors"
              >
                <span className="text-xs font-bold text-neutral-11 flex items-center gap-2">
                  <Layers size={14} className="text-neutral-08" />
                  Mapa de Calor Financeiro
                </span>
                <span className="text-neutral-06 text-xs">{openTutorialSection === 'heatmap' ? '−' : '+'}</span>
              </button>
              
              {openTutorialSection === 'heatmap' && (
                <div className="p-3 text-[11px] text-neutral-08 space-y-2 border-t border-neutral-02">
                  <p className="mb-2">Cada card de dia possui uma cor associada baseada no saldo acumulado para aquela data:</p>
                  
                  <div className="space-y-1.5 font-semibold">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50 flex-shrink-0" />
                      <span>Saldo Alto: R$ 5.000+ (Verde Vibrante)</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400/80">
                      <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/25 flex-shrink-0" />
                      <span>Saldo Saudável: R$ 300 - 5.000 (Verde)</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-300">
                      <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30 flex-shrink-0" />
                      <span>Saldo Alerta: R$ 100 - 300 (Amarelo)</span>
                    </div>
                    <div className="flex items-center gap-2 text-orange-300">
                      <span className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/30 flex-shrink-0" />
                      <span>Saldo Crítico: R$ 0 - 100 (Laranja)</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-300">
                      <span className="w-3 h-3 rounded bg-rose-500/25 border border-rose-500/40 flex-shrink-0" />
                      <span>Saldo Negativo: Abaixo de R$ 0 (Vermelho)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Topic 3: Economias/Reservas */}
            <div className="border border-neutral-02 rounded-xl overflow-hidden bg-neutral-01/30">
              <button
                onClick={() => toggleSection('savings')}
                className="w-full p-3 text-left flex items-center justify-between bg-neutral-01/60 hover:bg-neutral-02/40 transition-colors"
              >
                <span className="text-xs font-bold text-neutral-11 flex items-center gap-2">
                  <PiggyBank size={14} className="text-neutral-08" />
                  Mecânica de Economias (Roxo)
                </span>
                <span className="text-neutral-06 text-xs">{openTutorialSection === 'savings' ? '−' : '+'}</span>
              </button>
              
              {openTutorialSection === 'savings' && (
                <div className="p-3 text-[11px] text-neutral-08 leading-relaxed space-y-2 border-t border-neutral-02">
                  <p>
                    Transações de <strong>Economia / Investimento</strong> são destacadas em <strong>Roxo</strong> na plataforma.
                  </p>
                  <p>
                    Embora esses valores sejam deduzidos do seu saldo líquido diário (visto que saíram do caixa operacional disponível e foram transferidos para uma reserva), a interface os exibe de forma comemorativa e positiva, sem a conotação restritiva de despesas comuns.
                  </p>
                </div>
              )}
            </div>

          </div>

          <p className="text-[10px] text-neutral-08 border-t border-neutral-02 pt-3 leading-relaxed flex items-center gap-1">
            <CircleAlert size={10} />
            Void Finance v2.0 - Desenvolvido sob medida
          </p>
        </div>

      </div>

    </div>
  );
};
