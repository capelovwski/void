import { useState, useEffect } from 'react';
import { Wallet, List, Plus, TrendingUp, PenLine, Bell, User } from 'lucide-react';
import type { Transaction, Tag, PlanningConfig, RealSpends } from './types';
import { DEFAULT_TAGS, DEFAULT_PLANNING_CONFIG, getMockRealSpends, getMockTransactions } from './utils/mockData';

// Tabs import
import { SaldosTab } from './components/SaldosTab';
import { TransacoesTab } from './components/TransacoesTab';
import { RelatoriosTab } from './components/RelatoriosTab';
import { PlanejamentoTab } from './components/PlanejamentoTab';
import { PerfilTab } from './components/PerfilTab';
import { ParticleBackground } from './components/ParticleBackground';
import { TransactionModal } from './components/TransactionModal';

import voidDarkModeLogo from '../logo/void-dark-mode.svg';
import voidLightModeLogo from '../logo/void-light-mode.svg';
import voidIconDarkMode from '../logo/void-icon-dark-mode.svg';
import voidIconLightMode from '../logo/void-icon-light-mode.svg';

interface AppNotification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

function App() {
  // 1. App Navigation State
  const [activeTab, setActiveTab] = useState<'saldos' | 'transacoes' | 'relatorios' | 'configuracoes' | 'perfil'>('saldos');

  // 2. Theme & User Profiling
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('saldos_theme') === 'light' ? 'light' : 'dark');
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('saldos_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: 'n1', message: 'Bem-vindo ao Void! Explore o novo design minimalista.', date: 'Hoje', read: false },
    { id: 'n2', message: 'Calculamos a meta sugerida de economia com base na sua receita.', date: 'Ontem', read: false },
    { id: 'n3', message: 'Dica: use o mapa de calor progressivo para monitorar despesas.', date: '2 dias atrás', read: true }
  ]);

  // Theme effect hook
  useEffect(() => {
    localStorage.setItem('saldos_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('saldos_user', JSON.stringify(newUser));
    setNotifications(prev => [
      { id: `n-login-${Date.now()}`, message: `Sessão iniciada como ${newUser.name}. Seus dados estão sincronizados!`, date: 'Agora', read: false },
      ...prev
    ]);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('saldos_user');
    setNotifications(prev => [
      { id: `n-logout-${Date.now()}`, message: 'Sessão encerrada. Suas alterações continuarão salvas localmente.', date: 'Agora', read: false },
      ...prev
    ]);
  };

  // 3. Financial States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [initialBalance, setInitialBalance] = useState<number>(2000); // balance at start of month
  const [planningConfig, setPlanningConfig] = useState<PlanningConfig>(DEFAULT_PLANNING_CONFIG);
  const [realSpends, setRealSpends] = useState<RealSpends>({});

  // 4. Modal Toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');

  // 4. Initial Load (LocalStorage Check)
  useEffect(() => {
    const savedTransactions = localStorage.getItem('saldos_transactions');
    const savedTags = localStorage.getItem('saldos_tags');
    const savedBalance = localStorage.getItem('saldos_initial_balance');
    const savedPlanning = localStorage.getItem('saldos_planning_config');
    const savedRealSpends = localStorage.getItem('saldos_real_spends');

    if (savedTransactions && savedTags && savedBalance && savedPlanning && savedRealSpends) {
      setTransactions(JSON.parse(savedTransactions));
      setTags(JSON.parse(savedTags));
      setInitialBalance(parseFloat(savedBalance));
      setPlanningConfig(JSON.parse(savedPlanning));
      setRealSpends(JSON.parse(savedRealSpends));
    } else {
      // Seed default mock data
      const mockTrans = getMockTransactions();
      const mockSpends = getMockRealSpends();
      
      setTransactions(mockTrans);
      setTags(DEFAULT_TAGS);
      setInitialBalance(2000);
      setPlanningConfig(DEFAULT_PLANNING_CONFIG);
      setRealSpends(mockSpends);

      localStorage.setItem('saldos_transactions', JSON.stringify(mockTrans));
      localStorage.setItem('saldos_tags', JSON.stringify(DEFAULT_TAGS));
      localStorage.setItem('saldos_initial_balance', '2000');
      localStorage.setItem('saldos_planning_config', JSON.stringify(DEFAULT_PLANNING_CONFIG));
      localStorage.setItem('saldos_real_spends', JSON.stringify(mockSpends));
    }
  }, []);

  // 5. State Persistence Helpers
  const persistTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem('saldos_transactions', JSON.stringify(newTransactions));
  };

  const persistTags = (newTags: Tag[]) => {
    setTags(newTags);
    localStorage.setItem('saldos_tags', JSON.stringify(newTags));
  };

  const persistBalance = (newBalance: number) => {
    setInitialBalance(newBalance);
    localStorage.setItem('saldos_initial_balance', newBalance.toString());
  };

  const persistPlanningConfig = (newConfig: PlanningConfig) => {
    setPlanningConfig(newConfig);
    localStorage.setItem('saldos_planning_config', JSON.stringify(newConfig));
  };

  const handleUpdateRealSpend = (dateStr: string, value: number) => {
    const updated = {
      ...realSpends,
      [dateStr]: value,
    };
    setRealSpends(updated);
    localStorage.setItem('saldos_real_spends', JSON.stringify(updated));
  };

  // 6. CRUD Operations
  const handleSaveTransaction = (transactionData: Omit<Transaction, 'id'> & { id?: string }) => {
    if (transactionData.id) {
      const updated = transactions.map((t) =>
        t.id === transactionData.id ? (transactionData as Transaction) : t
      );
      persistTransactions(updated);
    } else {
      const newTransaction: Transaction = {
        ...transactionData,
        id: `t-${Date.now()}`,
      };
      persistTransactions([...transactions, newTransaction]);
    }
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const filtered = transactions.filter((t) => t.id !== id);
    persistTransactions(filtered);
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  const handleAddTag = (tagData: Omit<Tag, 'id'>) => {
    const newTag: Tag = {
      ...tagData,
      id: `tag-${Date.now()}`,
    };
    persistTags([...tags, newTag]);
  };

  const handleDeleteTag = (tagId: string) => {
    const filteredTags = tags.filter((t) => t.id !== tagId);
    persistTags(filteredTags);

    const updatedTransactions = transactions.map((t) =>
      t.tagId === tagId ? { ...t, tagId: undefined } : t
    );
    persistTransactions(updatedTransactions);
  };

  // Triggers
  const openNewTransactionModal = (date?: string) => {
    setEditingTransaction(null);
    setModalDefaultDate(date || new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditTransactionModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  // 7. Math calculations for Cascade Balances
  const todayStr = new Date().toISOString().split('T')[0];
  const totalFixedExpenses = planningConfig.fixedExpenses.reduce((sum, e) => sum + e.value, 0);
  const remainingBudget = Math.max(0, planningConfig.fixedRevenue - totalFixedExpenses);
  const daysInCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyBaseSpend = remainingBudget / daysInCurrentMonth;

  // Generate range of dates from start of current month to end of 3-month window
  const getDatesInRange = () => {
    const dates: string[] = [];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
    
    const current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const datesList = getDatesInRange();

  const calculateDailyBalances = () => {
    const balances: Record<string, number> = {};
    let running = initialBalance;
    
    datesList.forEach((dateStr) => {
      // 1. Specific scheduled transactions on this day
      const dayTransactions = transactions.filter((t) => t.date === dateStr);
      const dayEntradas = dayTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.value, 0);
      const daySaidas = dayTransactions.filter(t => t.type !== 'entrada').reduce((sum, t) => sum + t.value, 0);
      
      // 2. Daily spends (Real spend if past/today, Gasto Diário Base if future)
      let spend = 0;
      if (dateStr <= todayStr) {
        spend = realSpends[dateStr] ?? 0;
      } else {
        spend = dailyBaseSpend;
      }
      
      running = running + dayEntradas - daySaidas - spend;
      balances[dateStr] = running;
    });
    
    return balances;
  };

  const dailyBalances = calculateDailyBalances();

  return (
    <div className="min-h-screen bg-bg-01 flex flex-col font-geist relative">
      <ParticleBackground theme={theme} />
      
      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        {/* Desktop Sidebar Navigation (Apple Dynamic Style) - Centralized & Floating */}
      <aside className="hidden desktop:flex flex-col fixed left-4 top-1/2 -translate-y-1/2 z-40 bg-neutral-00 text-neutral-11 rounded-3xl border border-neutral-03/80 shadow-2xl transition-all duration-300 ease-in-out w-18 hover:w-56 group px-3 py-6 overflow-hidden h-fit max-h-[85vh]">
        {/* Top Section / Logo Glyph */}
        <div className="flex items-center justify-center group-hover:justify-start mb-8 flex-shrink-0 w-full group-hover:pl-4 transition-all duration-300">
          <img 
            src={theme === 'dark' ? voidIconDarkMode : voidIconLightMode} 
            alt="Void Icon" 
            className="w-11 h-11 object-contain transition-all duration-300 group-hover:scale-110" 
          />
        </div>

        {/* Navigation Slots */}
        <div className="flex-1 flex flex-col gap-2 w-full">
          {/* Saldos */}
          <button
            onClick={() => setActiveTab('saldos')}
            className={`flex items-center w-full px-3 py-3 rounded-2xl transition-all ${
              activeTab === 'saldos'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02/60'
            }`}
          >
            <Wallet size={20} className="flex-shrink-0 mx-auto group-hover:mx-0" />
            <span className="text-xs font-semibold group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden w-0 group-hover:w-auto">
              Saldos
            </span>
          </button>

          {/* Lista */}
          <button
            onClick={() => setActiveTab('transacoes')}
            className={`flex items-center w-full px-3 py-3 rounded-2xl transition-all ${
              activeTab === 'transacoes'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02/60'
            }`}
          >
            <List size={20} className="flex-shrink-0 mx-auto group-hover:mx-0" />
            <span className="text-xs font-semibold group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden w-0 group-hover:w-auto">
              Lista
            </span>
          </button>

          {/* Relatórios */}
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`flex items-center w-full px-3 py-3 rounded-2xl transition-all ${
              activeTab === 'relatorios'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02/60'
            }`}
          >
            <TrendingUp size={20} className="flex-shrink-0 mx-auto group-hover:mx-0" />
            <span className="text-xs font-semibold group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden w-0 group-hover:w-auto">
              Relatórios
            </span>
          </button>

          {/* Planejamento */}
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`flex items-center w-full px-3 py-3 rounded-2xl transition-all ${
              activeTab === 'configuracoes'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02/60'
            }`}
          >
            <PenLine size={20} className="flex-shrink-0 mx-auto group-hover:mx-0" />
            <span className="text-xs font-semibold group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden w-0 group-hover:w-auto">
              Planejamento
            </span>
          </button>

          {/* Perfil */}
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center w-full px-3 py-3 rounded-2xl transition-all ${
              activeTab === 'perfil'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02/60'
            }`}
          >
            <User size={20} className="flex-shrink-0 mx-auto group-hover:mx-0" />
            <span className="text-xs font-semibold group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden w-0 group-hover:w-auto">
              Perfil
            </span>
          </button>
        </div>

        {/* Sidebar Footer: Add Plus Button */}
        <div className="w-full pt-4 border-t border-neutral-02 flex items-center justify-center flex-shrink-0 mt-4">
          <button
            onClick={() => openNewTransactionModal()}
            className="bg-main text-zinc-950 rounded-[20px] flex items-center transition-all duration-300 hover:scale-[1.06] active:scale-95 shadow-md hover:shadow-main/20 w-12 h-12 group-hover:w-full px-3 py-3 border border-neutral-04/55 font-semibold"
            title="Nova Movimentação"
          >
            <Plus size={20} className="flex-shrink-0 mx-auto group-hover:mx-0" />
            <span className="text-xs font-bold group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden w-0 group-hover:w-auto">
              Lançar
            </span>
          </button>
        </div>
      </aside>

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-bg-01/80 backdrop-blur-md border-b border-neutral-03/60 px-6 py-4 flex items-center justify-between relative">
        <div className="flex items-center">
          <div className="h-10" />
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <img 
            src={theme === 'dark' ? voidDarkModeLogo : voidLightModeLogo} 
            alt="Void Logo" 
            className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-105" 
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl bg-neutral-00 border border-neutral-03/80 hover:bg-neutral-02 text-neutral-10 transition-all relative"
              title="Notificações"
            >
              <Bell size={18} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-neutral-03/80 bg-neutral-00 p-4 shadow-xl z-50 animate-appear">
                <div className="flex items-center justify-between border-b border-neutral-02 pb-2 mb-2">
                  <span className="text-xs font-bold text-neutral-11">Notificações</span>
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={() => {
                        setNotifications(notifications.map(n => ({ ...n, read: true })));
                      }}
                      className="text-[9px] font-bold text-neutral-08 hover:text-neutral-11 transition-all"
                    >
                      Limpar Lidas
                    </button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-neutral-08 text-center py-4">Nenhuma notificação.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-2 rounded-lg text-[10px] border transition-colors ${n.read ? 'border-neutral-01 bg-neutral-01/30 text-neutral-08' : 'border-main/20 bg-main/5 text-neutral-11 font-medium'}`}>
                        <p>{n.message}</p>
                        <span className="text-[8px] text-neutral-06 mt-1 block">{n.date}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <button
            onClick={() => {
              setActiveTab('perfil');
              setShowNotifications(false);
            }}
            className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all flex items-center justify-center bg-neutral-01 text-neutral-08 ${
              activeTab === 'perfil' ? 'border-main scale-105' : 'border-neutral-03/80 hover:border-neutral-11'
            }`}
            title="Perfil do Usuário"
          >
            {user ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User size={16} />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl desktop:max-w-7xl w-full mx-auto px-4 tablet:px-6 py-6 desktop:pl-28">
        {activeTab === 'saldos' && (
          <SaldosTab
            transactions={transactions}
            tags={tags}
            onAddTransactionClick={openNewTransactionModal}
            dailyBalances={dailyBalances}
            theme={theme}
          />
        )}

        {activeTab === 'transacoes' && (
          <TransacoesTab
            transactions={transactions}
            tags={tags}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={openEditTransactionModal}
          />
        )}

        {activeTab === 'relatorios' && (
          <RelatoriosTab
            transactions={transactions}
            tags={tags}
            initialBalance={initialBalance}
          />
        )}

        {activeTab === 'configuracoes' && (
          <PlanejamentoTab
            transactions={transactions}
            tags={tags}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
            initialBalance={initialBalance}
            setInitialBalance={persistBalance}
            planningConfig={planningConfig}
            setPlanningConfig={persistPlanningConfig}
          />
        )}

        {activeTab === 'perfil' && (
          <PerfilTab
            theme={theme}
            setTheme={setTheme}
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Navigation Footer (Floating Navigation Menu) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-2 bg-gradient-to-t from-bg-01 via-bg-01 to-transparent desktop:hidden">
        <div className="max-w-md mx-auto bg-neutral-12 text-neutral-01 rounded-3xl border border-neutral-10/40 shadow-2xl flex items-center justify-around py-3 px-4 relative">
          
          {/* Slot 1: Saldos */}
          <button
            onClick={() => setActiveTab('saldos')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'saldos' ? 'text-main scale-105' : 'text-neutral-08 hover:text-neutral-01'
            }`}
          >
            <Wallet size={20} />
            <span className="text-[10px] font-medium font-geist">Saldos</span>
          </button>

          {/* Slot 2: Transações */}
          <button
            onClick={() => setActiveTab('transacoes')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'transacoes' ? 'text-main scale-105' : 'text-neutral-08 hover:text-neutral-01'
            }`}
          >
            <List size={20} />
            <span className="text-[10px] font-medium font-geist">Lista</span>
          </button>

          {/* Slot 3: Highlighted Central Plus Button */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <button
              onClick={() => openNewTransactionModal()}
              className="absolute top-[-26px] bg-main text-zinc-950 w-14 h-14 rounded-full border-4 border-neutral-12 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
              title="Nova Movimentação"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>

          {/* Slot 4: Relatórios */}
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'relatorios' ? 'text-main scale-105' : 'text-neutral-08 hover:text-neutral-01'
            }`}
          >
            <TrendingUp size={20} />
            <span className="text-[10px] font-medium font-geist">Relatórios</span>
          </button>

          {/* Slot 5: Planejamento */}
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'configuracoes' ? 'text-main scale-105' : 'text-neutral-08 hover:text-neutral-01'
            }`}
          >
            <PenLine size={20} />
            <span className="text-[10px] font-medium font-geist">Planejamento</span>
          </button>

        </div>
      </nav>
      </div>

      {/* Transaction Entry/Edit Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        tags={tags}
        editingTransaction={editingTransaction}
        defaultDate={modalDefaultDate}
        dailyBaseSpend={dailyBaseSpend}
        realSpends={realSpends}
        onUpdateRealSpend={handleUpdateRealSpend}
      />
    </div>
  );
}

export default App;
