import { useState, useEffect, useMemo, useRef } from 'react';
import { Wallet, List, Plus, TrendingUp, PenLine, Bell, User, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BudgetConfig, Transaction, Tag, PlanningConfig, Bank, Card } from './types';
import {
  SCHEMA_VERSION,
  addMonthsYMD,
  buildProjection,
  dailyBudgetFrom,
  endOfMonthYMD,
  DEFAULT_DAYS_DIVISOR,
  planMigration,
  round2,
  startOfMonthYMD,
  todayYMD,
} from './core';
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
import { ParticleBackground } from './components/ParticleBackground';
import { TransactionModal } from './components/TransactionModal';
import { AuthScreen } from './components/auth/AuthScreen';

import voidDarkModeLogo from '../logo/void-dark-mode.svg';
import voidLightModeLogo from '../logo/void-light-mode.svg';
import voidIconDarkMode from '../logo/void-icon-dark-mode.svg';
import voidIconLightMode from '../logo/void-icon-light-mode.svg';

/** Tamanho do horizonte de projeção, em meses a partir do mês atual. */
const HORIZON_MONTHS = 12;

type TabId = 'saldos' | 'transacoes' | 'relatorios' | 'configuracoes' | 'perfil';

const MOBILE_NAV_ITEMS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'saldos', label: 'Saldos', icon: Wallet },
  { id: 'transacoes', label: 'Lista', icon: List },
  { id: 'relatorios', label: 'Relatórios', icon: TrendingUp },
  { id: 'configuracoes', label: 'Planejamento', icon: PenLine },
];

/**
 * Mola da barra. O amortecimento fica um pouco abaixo do crítico de propósito:
 * a pílula chega ao destino com um resto de inércia, que é o que dá a sensação
 * de massa da Dynamic Island. Amortecer demais deixa o movimento "mecânico".
 */
const ISLAND_SPRING = { type: 'spring', stiffness: 360, damping: 26, mass: 0.9 } as const;

/** O rótulo acompanha a pílula um pouco mais rápido, para não ficar arrastando atrás. */
const ISLAND_LABEL_SPRING = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 } as const;

/**
 * Descrição usada pelo atalho de um campo só ("gastei X hoje"). Ela identifica
 * o lançamento que o atalho controla, para que editar o campo atualize sempre
 * o mesmo documento em vez de criar um novo a cada digitação.
 */
const QUICK_DAILY_DESCRIPTION = 'Gasto do dia';

interface AppNotification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}

function App() {
  // 1. App Navigation State
  const [activeTab, setActiveTab] = useState<TabId>('saldos');

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

  const {
    items: cards,
    loading: cardsLoading,
    addItem: addCardDoc,
    setItem: setCardDoc,
    removeItem: removeCardDoc,
  } = useUserCollection<Card>(userId, 'cards');

  const { settings, loading: settingsLoading, updateSettings } = useFinanceSettings(userId);

  const financeDataLoading =
    transactionsLoading || tagsLoading || banksLoading || cardsLoading || settingsLoading;
  const initialBalance = settings?.initialBalance ?? 0;
  const planningConfig: PlanningConfig = settings?.planningConfig ?? { fixedRevenue: 0, fixedExpenses: [] };

  // O gasto diário tem uma fonte só: o orçamento mensal das categorias dividido
  // pelo divisor de dias. Receita menos despesas fixas é outro número — quanto
  // sobra da renda — e não alimenta esta conta.
  const budgetConfig: BudgetConfig = { daysDivisor: settings?.budgetConfig?.daysDivisor || DEFAULT_DAYS_DIVISOR };
  const dailyBudget = dailyBudgetFrom(tags, budgetConfig);

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
        // Conta nova já nasce no formato atual, então a migração abaixo não roda.
        await Promise.all(DEFAULT_TAGS.map((t) => setTagDoc(t)));
        await updateSettings({
          initialBalance: 0,
          planningConfig: { fixedRevenue: 0, fixedExpenses: [] },
          realSpends: {},
          budgetConfig: { daysDivisor: DEFAULT_DAYS_DIVISOR },
          schemaVersion: SCHEMA_VERSION,
        });
      }
    })();
  }, [userId, financeDataLoading, transactions.length, tags.length, banks.length, settings]);

  // Migração para o modelo de 5 tipos: converte `fatura` em `cartao`, promove a
  // tag única para a lista de tags e transforma o mapa `realSpends` em
  // movimentações do tipo `diario`. Roda uma vez por conta; o plano em si é
  // calculado por uma função pura e testada (core/migration.ts).
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!userId || financeDataLoading || !settings || migratedRef.current) return;
    if ((settings.schemaVersion ?? 1) >= SCHEMA_VERSION) return;

    migratedRef.current = true;

    (async () => {
      const plan = planMigration({
        transactions,
        tags,
        realSpends: settings.realSpends,
        planningConfig: settings.planningConfig,
        existingBudget: settings.budgetConfig,
        currentSchemaVersion: settings.schemaVersion ?? 1,
      });
      if (plan.isNoop) return;

      await Promise.all([
        ...plan.transactionsToUpdate.map((t) => setTransactionDoc(t)),
        ...plan.transactionsToCreate.map((t) => setTransactionDoc(t)),
        ...plan.tagsToUpdate.map((t) => setTagDoc(t)),
        ...plan.tagsToCreate.map((t) => setTagDoc(t)),
      ]);
      // `realSpends` continua gravado como histórico — a cópia para `diario` é
      // idempotente, então nada se perde se a migração for interrompida no meio.
      await updateSettings({ budgetConfig: plan.budgetConfig, schemaVersion: plan.schemaVersion });
    })();
  }, [userId, financeDataLoading, settings, transactions, tags]);

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

  /**
   * Atalho de um campo só: "gastei X neste dia" grava (ou atualiza) um único
   * lançamento `diario`, em vez de obrigar a lançar item a item. Zerar o campo
   * apaga o lançamento — nada gasto e nada anotado dão o mesmo saldo.
   */
  const handleSetDailySpend = async (dateStr: string, value: number) => {
    const existing = transactions.find(
      (t) => t.type === 'diario' && t.date === dateStr && t.description === QUICK_DAILY_DESCRIPTION,
    );

    if (value <= 0) {
      if (existing) await removeTransactionDoc(existing.id);
      return;
    }

    if (existing) {
      await setTransactionDoc({ ...existing, value: round2(value) });
    } else {
      await addTransactionDoc({
        type: 'diario',
        value: round2(value),
        description: QUICK_DAILY_DESCRIPTION,
        date: dateStr,
        recurrence: 'nenhuma',
      });
    }
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

  const handleSaveTag = async (tagData: Omit<Tag, 'id'> & { id?: string }) => {
    if (tagData.id) {
      await setTagDoc(tagData as Tag);
    } else {
      await addTagDoc(tagData);
    }
  };

  const handleSaveCard = async (cardData: Omit<Card, 'id'> & { id?: string }) => {
    if (cardData.id) {
      await setCardDoc(cardData as Card);
    } else {
      await addCardDoc(cardData);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    await removeCardDoc(cardId);

    // As compras que apontavam para o cartão viram gastos de cartão soltos: a
    // data de vencimento já está gravada em cada uma, então nenhum saldo muda.
    const affected = transactions.filter((t) => t.cardId === cardId);
    await Promise.all(affected.map((t) => setTransactionDoc({ ...t, cardId: undefined })));
  };

  const persistBudgetConfig = async (config: BudgetConfig) => {
    await updateSettings({ budgetConfig: config });
  };

  const handleDeleteTag = async (tagId: string) => {
    await removeTagDoc(tagId);

    // Desvincula a tag das movimentações, cobrindo o campo antigo e o novo.
    const affected = transactions.filter((t) => t.tagId === tagId || t.tagIds?.includes(tagId));
    await Promise.all(
      affected.map((t) =>
        setTransactionDoc({
          ...t,
          tagId: undefined,
          tagIds: (t.tagIds ?? []).filter((id) => id !== tagId),
        }),
      ),
    );
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

  /**
   * Item da barra mobile. Inativo é só o ícone num alvo de 44px; ativo vira uma
   * pílula que revela o rótulo.
   *
   * O preenchimento da pílula é um elemento com `layoutId` compartilhado entre
   * todos os itens, então o framer-motion o trata como o MESMO objeto mudando de
   * lugar: ele desliza fisicamente de um item ao outro em vez de desaparecer
   * aqui e reaparecer ali. É esse deslocamento contínuo que dá a leitura de
   * Dynamic Island — animar só a largura de cada item, como antes, produzia
   * duas mudanças independentes e o movimento não lia como um objeto só.
   */
  const renderNavItem = (item: (typeof MOBILE_NAV_ITEMS)[number]) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <motion.button
        key={item.id}
        layout
        transition={ISLAND_SPRING}
        onClick={() => setActiveTab(item.id)}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex items-center justify-center gap-1.5 h-11 rounded-full flex-shrink-0 ${
          isActive ? 'px-3 text-neutral-00' : 'w-11 text-neutral-08 active:text-neutral-11'
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="nav-island"
            transition={ISLAND_SPRING}
            className="absolute inset-0 rounded-full bg-neutral-12 shadow-lg"
          />
        )}

        {/* O conteúdo fica acima do preenchimento que desliza por baixo. */}
        <Icon size={19} className="relative z-10 flex-shrink-0" />

        <AnimatePresence initial={false} mode="popLayout">
          {isActive && (
            <motion.span
              key="label"
              /* O desfoque na entrada e na saída faz o texto "materializar"
                 junto com a pílula, em vez de piscar num corte de opacidade. */
              initial={{ opacity: 0, width: 0, filter: 'blur(6px)', x: -4 }}
              animate={{ opacity: 1, width: 'auto', filter: 'blur(0px)', x: 0 }}
              exit={{ opacity: 0, width: 0, filter: 'blur(6px)', x: -4 }}
              transition={ISLAND_LABEL_SPRING}
              /* min-w-0 deixa o rótulo encolher em telas muito estreitas
                 (320px), truncando em vez de empurrar a barra para fora. */
              className="relative z-10 text-xs font-semibold whitespace-nowrap overflow-hidden min-w-0"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  // 7. Projeção de saldo — 12 meses a partir do 1º dia do mês atual.
  //
  // `initialBalance` é, por definição, o saldo no primeiro dia do mês atual, e
  // é a única âncora confiável da cascata: por isso o horizonte começa
  // exatamente ali. Olhar para meses anteriores vai exigir guardar o saldo
  // fechado de cada mês, o que ainda não existe.
  const todayStr = todayYMD();
  const horizonStart = startOfMonthYMD(todayStr);
  const horizonEnd = endOfMonthYMD(addMonthsYMD(horizonStart, HORIZON_MONTHS - 1));

  const { projection } = useMemo(
    () =>
      buildProjection({
        transactions,
        initialBalance,
        start: horizonStart,
        end: horizonEnd,
        today: todayStr,
        dailyBudget,
      }),
    [transactions, initialBalance, horizonStart, horizonEnd, todayStr, dailyBudget],
  );

  // Mapa data -> saldo: formato que as telas de calendário já consomem.
  const dailyBalances = useMemo(
    () => Object.fromEntries(projection.days.map((d) => [d.date, d.balance])),
    [projection],
  );

  // Valor atual do atalho "gasto do dia", por data. É só o lançamento rápido e
  // não a soma de todos os diários, para o campo refletir o que ele mesmo grava.
  const quickDailyByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === 'diario' && t.description === QUICK_DAILY_DESCRIPTION) map[t.date] = t.value;
    }
    return map;
  }, [transactions]);

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
      {/* pt-[env(safe-area-inset-top)] empurra o conteúdo para baixo da status
          bar do iPhone (relógio, wi-fi, bateria, Dynamic Island). */}
      <header
        className="sticky top-0 z-30 bg-bg-01/80 backdrop-blur-md border-b border-neutral-03/60 px-6 pb-3 flex items-center justify-between flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center min-w-0">
          <img
            src={theme === 'dark' ? voidDarkModeLogo : voidLightModeLogo}
            alt="Void Logo"
            className="h-8 tablet:h-12 w-auto max-w-[45vw] object-contain shrink-0 transition-transform duration-300 hover:scale-105"
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
            dailyBudget={dailyBudget}
            onGoToPlanning={() => setActiveTab('configuracoes')}
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
            onSaveTag={handleSaveTag}
            onDeleteTag={handleDeleteTag}
            initialBalance={initialBalance}
            setInitialBalance={persistBalance}
            planningConfig={planningConfig}
            setPlanningConfig={persistPlanningConfig}
            cards={cards}
            onSaveCard={handleSaveCard}
            onDeleteCard={handleDeleteCard}
            budgetConfig={budgetConfig}
            setBudgetConfig={persistBudgetConfig}
          />
        )}

        {activeTab === 'perfil' && (
          <PerfilTab
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </main>

      {/* Navegação mobile — barra flutuante estilo Dynamic Island.
          Só o item ativo mostra o rótulo; os demais ficam apenas com o ícone, e
          a barra encolhe/estica junto com a pílula em vez de ter largura fixa. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 flex justify-center pointer-events-none desktop:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <motion.div
          layout
          transition={ISLAND_SPRING}
          className="glass-edge pointer-events-auto max-w-full flex items-center gap-0.5 p-1 rounded-full border border-neutral-03/60 bg-neutral-00/70 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl"
        >
          {MOBILE_NAV_ITEMS.slice(0, 2).map(renderNavItem)}

          <motion.button
            layout
            transition={ISLAND_SPRING}
            onClick={() => openNewTransactionModal()}
            className="w-11 h-11 flex-shrink-0 rounded-full bg-main text-zinc-950 flex items-center justify-center shadow-md active:scale-90 transition-transform"
            title="Nova Movimentação"
            aria-label="Nova movimentação"
          >
            <Plus size={20} />
          </motion.button>

          {MOBILE_NAV_ITEMS.slice(2).map(renderNavItem)}
        </motion.div>
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
            dailyBudget={dailyBudget}
            cards={cards}
            quickDailyByDate={quickDailyByDate}
            onSetDailySpend={handleSetDailySpend}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
