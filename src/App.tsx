import { useState, useEffect, useRef } from 'react';
import { Wallet, List, Plus, TrendingUp, PenLine, Bell, User, NotebookPen } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import type { Transaction, Tag, PlanningConfig, RealSpends, Bank } from './types';
import { DEFAULT_TAGS } from './utils/mockData';
import { useAuth } from './contexts/AuthContext';
import { useUserCollection } from './hooks/useUserCollection';
import { useFinanceSettings } from './hooks/useFinanceSettings';

// Tabs import
import { SaldosTab } from './components/SaldosTab';
import { TransacoesTab } from './components/TransacoesTab';
import { RelatoriosTab } from './components/RelatoriosTab';
import { PlanejamentoTab } from './components/PlanejamentoTab';
import { PerfilTab } from './components/PerfilTab';
import { NotesTab } from './components/NotesTab';
import { ParticleBackground } from './components/ParticleBackground';
import { TransactionModal } from './components/TransactionModal';
import { AuthScreen } from './components/auth/AuthScreen';

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

function App() {
  // 1. App Navigation State
  const [activeTab, setActiveTab] = useState<'saldos' | 'transacoes' | 'relatorios' | 'configuracoes' | 'notas' | 'perfil'>('saldos');

  // 2. Theme & Auth
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('saldos_theme') === 'light' ? 'light' : 'dark');
  });

  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid ?? null;

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

  // 3. Financial States (Firestore, isolados por usuário)
  const {
    items: transactions,
    loading: transactionsLoading,
    addItem: addTransactionDoc,
    setItem: setTransactionDoc,
    removeItem: removeTransactionDoc,
  } = useUserCollection<Transaction>(userId, 'transactions');

  const {
    items: tags,
    loading: tagsLoading,
    addItem: addTagDoc,
    setItem: setTagDoc,
    removeItem: removeTagDoc,
  } = useUserCollection<Tag>(userId, 'tags');

  const {
    items: banks,
    loading: banksLoading,
    addItem: addBankDoc,
    setItem: setBankDoc,
    removeItem: removeBankDoc,
  } = useUserCollection<Bank>(userId, 'banks');

  const { settings, loading: settingsLoading, updateSettings } = useFinanceSettings(userId);

  const financeDataLoading = transactionsLoading || tagsLoading || banksLoading || settingsLoading;
  const initialBalance = settings?.initialBalance ?? 0;
  const planningConfig: PlanningConfig = settings?.planningConfig ?? { fixedRevenue: 0, fixedExpenses: [] };
  const realSpends: RealSpends = settings?.realSpends ?? {};

  const persistBanks = async (newBanks: Bank[]) => {
    const newIds = new Set(newBanks.map((b) => b.id));
    const removedBanks = banks.filter((b) => !newIds.has(b.id));
    await Promise.all(removedBanks.map((b) => removeBankDoc(b.id)));
    await Promise.all(newBanks.map((b) => setBankDoc(b)));

    const newTotal = newBanks.reduce((sum, b) => sum + b.balance, 0);
    await updateSettings({ initialBalance: newTotal });
  };

  // 4. Modal Toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');

  // Migração/seed única: na primeira carga de uma conta sem nenhum dado no
  // Firestore, tenta migrar dados antigos salvos no localStorage (de quando
  // o app não tinha login); se não houver nada, cria só as tags padrão e um
  // documento de configurações neutro (sem dados fictícios).
  const seededRef = useRef(false);
  useEffect(() => {
    if (!userId || financeDataLoading || seededRef.current) return;

    const hasCloudData = transactions.length > 0 || tags.length > 0 || banks.length > 0 || settings !== null;
    seededRef.current = true;
    if (hasCloudData) return;

    (async () => {
      const legacyTransactions = localStorage.getItem('saldos_transactions');
      const legacyTags = localStorage.getItem('saldos_tags');
      const legacyBanks = localStorage.getItem('void_banks');
      const legacyPlanning = localStorage.getItem('saldos_planning_config');
      const legacyRealSpends = localStorage.getItem('saldos_real_spends');
      const legacyBalance = localStorage.getItem('saldos_initial_balance');

      if (legacyTransactions || legacyTags || legacyBanks) {
        if (legacyTransactions) {
          await Promise.all((JSON.parse(legacyTransactions) as Transaction[]).map((t) => setTransactionDoc(t)));
        }
        if (legacyTags) {
          await Promise.all((JSON.parse(legacyTags) as Tag[]).map((t) => setTagDoc(t)));
        }
        if (legacyBanks) {
          await Promise.all((JSON.parse(legacyBanks) as Bank[]).map((b) => setBankDoc(b)));
        }
        await updateSettings({
          initialBalance: legacyBalance ? parseFloat(legacyBalance) : 0,
          planningConfig: legacyPlanning ? JSON.parse(legacyPlanning) : { fixedRevenue: 0, fixedExpenses: [] },
          realSpends: legacyRealSpends ? JSON.parse(legacyRealSpends) : {},
        });
      } else {
        await Promise.all(DEFAULT_TAGS.map((t) => setTagDoc(t)));
        await updateSettings({
          initialBalance: 0,
          planningConfig: { fixedRevenue: 0, fixedExpenses: [] },
          realSpends: {},
        });
      }
    })();
  }, [userId, financeDataLoading, transactions.length, tags.length, banks.length, settings]);

  // 5. State Persistence Helpers
  const persistBalance = async (newBalance: number) => {
    await updateSettings({ initialBalance: newBalance });

    // Scale banks proportionally to match new total balance
    if (banks.length > 0) {
      const currentTotal = banks.reduce((sum, b) => sum + b.balance, 0);
      const ratio = currentTotal > 0 ? newBalance / currentTotal : 0;

      const scaledBanks = banks.map((b, idx) => {
        if (idx === banks.length - 1) {
          // Adjust last bank to avoid rounding errors
          const prefixSum = banks.slice(0, -1).reduce((sum, bank) => sum + Math.round(bank.balance * ratio * 100) / 100, 0);
          return { ...b, balance: Math.max(0, Math.round((newBalance - prefixSum) * 100) / 100) };
        }
        return { ...b, balance: Math.round(b.balance * ratio * 100) / 100 };
      });
      await Promise.all(scaledBanks.map((b) => setBankDoc(b)));
    } else {
      // If no banks, create a default cash/general bank
      await addBankDoc({ name: 'Saldo Geral', color: '#8F8F9B', balance: newBalance });
    }
  };

  const persistPlanningConfig = async (newConfig: PlanningConfig) => {
    await updateSettings({ planningConfig: newConfig });
  };

  const handleUpdateRealSpend = async (dateStr: string, value: number) => {
    await updateSettings({ realSpends: { ...realSpends, [dateStr]: value } });
  };

  // 6. CRUD Operations
  const handleSaveTransaction = async (transactionData: Omit<Transaction, 'id'> & { id?: string }) => {
    if (transactionData.id) {
      await setTransactionDoc(transactionData as Transaction);
    } else {
      await addTransactionDoc(transactionData);
    }
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    await removeTransactionDoc(id);
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  const handleAddTag = async (tagData: Omit<Tag, 'id'>) => {
    await addTagDoc(tagData);
  };

  const handleDeleteTag = async (tagId: string) => {
    await removeTagDoc(tagId);

    const affected = transactions.filter((t) => t.tagId === tagId);
    await Promise.all(affected.map((t) => setTransactionDoc({ ...t, tagId: undefined })));
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

  // Dados financeiros agora vivem no Firestore por usuário, então o app
  // inteiro exige login antes de mostrar qualquer tela.
  if (authLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-bg-01">
        <span className="w-8 h-8 border-2 border-neutral-08 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-bg-01 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <img
              src={theme === 'dark' ? voidDarkModeLogo : voidLightModeLogo}
              alt="Void"
              className="h-12 w-auto object-contain"
            />
          </div>
          <AuthScreen />
        </div>
      </div>
    );
  }

  if (financeDataLoading || !settings) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-bg-01">
        <span className="w-8 h-8 border-2 border-neutral-08 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] desktop:h-auto desktop:min-h-screen bg-bg-01 flex flex-col font-geist relative overflow-hidden desktop:overflow-visible">
      <ParticleBackground theme={theme} />
      
      <div className="relative z-10 flex flex-col flex-1 h-full desktop:h-auto overflow-hidden desktop:overflow-visible">
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

          {/* Notas */}
          <button
            onClick={() => setActiveTab('notas')}
            className={`flex items-center w-full px-3 py-3 rounded-2xl transition-all ${
              activeTab === 'notas'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02/60'
            }`}
          >
            <NotebookPen size={20} className="flex-shrink-0 mx-auto group-hover:mx-0" />
            <span className="text-xs font-semibold group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden w-0 group-hover:w-auto">
              Notas
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
      <header className="sticky top-0 z-30 bg-bg-01/80 backdrop-blur-md border-b border-neutral-03/60 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
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
              <span className="text-xs font-bold text-neutral-11 uppercase">{user.email?.charAt(0) ?? '?'}</span>
            ) : (
              <User size={16} />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-w-5xl desktop:max-w-7xl w-full mx-auto px-4 tablet:px-6 py-6 desktop:pl-28 pb-28 desktop:pb-6">
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
            banks={banks}
            onUpdateBanks={persistBanks}
            theme={theme}
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

        {activeTab === 'notas' && <NotesTab />}

        {activeTab === 'perfil' && (
          <PerfilTab
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </main>

      {/* Navigation Footer (Floating Navigation Menu - Desktop Style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-2 bg-gradient-to-t from-bg-01 via-bg-01 to-transparent desktop:hidden">
        <div className="max-w-md mx-auto bg-neutral-00/95 backdrop-blur-md text-neutral-11 rounded-3xl border border-neutral-03/80 shadow-2xl flex items-center justify-around py-2 px-3 relative">
          
          {/* Slot 1: Saldos */}
          <button
            onClick={() => setActiveTab('saldos')}
            className={`px-1.5 py-1.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'saldos'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 dark:text-neutral-05 hover:text-neutral-11'
            }`}
            style={{ minWidth: '52px', minHeight: '48px' }}
            title="Saldos"
          >
            <Wallet size={20} />
            <span className="text-[8px] font-bold mt-0.5 leading-none">Saldos</span>
          </button>
 
          {/* Slot 2: Transações */}
          <button
            onClick={() => setActiveTab('transacoes')}
            className={`px-1.5 py-1.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'transacoes'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 dark:text-neutral-05 hover:text-neutral-11'
            }`}
            style={{ minWidth: '52px', minHeight: '48px' }}
            title="Lista"
          >
            <List size={20} />
            <span className="text-[8px] font-bold mt-0.5 leading-none">Lista</span>
          </button>
 
          {/* Slot 3: Highlighted Central Plus Button (Desktop Squircle Style & Centered) */}
          <div className="flex items-center justify-center flex-shrink-0">
            <button
              onClick={() => openNewTransactionModal()}
              className="bg-main text-zinc-950 w-12 h-12 rounded-[20px] border border-neutral-04/55 shadow-md hover:shadow-main/20 flex items-center justify-center active:scale-95 transition-all duration-300 hover:scale-[1.06]"
              title="Nova Movimentação"
            >
              <Plus size={20} className="flex-shrink-0" />
            </button>
          </div>
 
          {/* Slot 4: Relatórios */}
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-1.5 py-1.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'relatorios'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 dark:text-neutral-05 hover:text-neutral-11'
            }`}
            style={{ minWidth: '52px', minHeight: '48px' }}
            title="Relatórios"
          >
            <TrendingUp size={20} />
            <span className="text-[8px] font-bold mt-0.5 leading-none">Relatórios</span>
          </button>
 
          {/* Slot 5: Planejamento */}
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`px-1.5 py-1.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'configuracoes'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 dark:text-neutral-05 hover:text-neutral-11'
            }`}
            style={{ minWidth: '52px', minHeight: '48px' }}
            title="Planejamento"
          >
            <PenLine size={20} />
            <span className="text-[8px] font-bold mt-0.5 leading-none">Planejamento</span>
          </button>

          {/* Slot 6: Notas */}
          <button
            onClick={() => setActiveTab('notas')}
            className={`px-1.5 py-1.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'notas'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 dark:text-neutral-05 hover:text-neutral-11'
            }`}
            style={{ minWidth: '52px', minHeight: '48px' }}
            title="Notas"
          >
            <NotebookPen size={20} />
            <span className="text-[8px] font-bold mt-0.5 leading-none">Notas</span>
          </button>
        </div>
      </nav>
      </div>

      {/* Transaction Entry/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
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
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
