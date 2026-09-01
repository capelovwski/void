import React, { useState } from 'react';
import {
  Award, CreditCard, FileText, Layers, PiggyBank, Sparkles, Target, TrendingUp, Wallet, Zap,
} from 'lucide-react';
import type { BudgetConfig, Card, PlanningConfig, Tag, Transaction } from '../types';
import { budgetedCategories, dailyBudgetFrom, formatBRL, monthlyBudgetTotal, round2 } from '../core';
import { NotesSection } from './NotesSection';
import { CardsSection } from './planning/CardsSection';
import { CategoriesSection } from './planning/CategoriesSection';
import { IncomeSection } from './planning/IncomeSection';
import { KpiCard, type KpiStatus } from './planning/KpiCard';

interface PlanejamentoTabProps {
  transactions: Transaction[];
  tags: Tag[];
  onSaveTag: (tag: Omit<Tag, 'id'> & { id?: string }) => void;
  onDeleteTag: (id: string) => void;
  initialBalance: number;
  setInitialBalance: (balance: number) => void;
  planningConfig: PlanningConfig;
  setPlanningConfig: (config: PlanningConfig) => void;
  cards: Card[];
  onSaveCard: (card: Omit<Card, 'id'> & { id?: string }) => void;
  onDeleteCard: (cardId: string) => void;
  budgetConfig: BudgetConfig;
  setBudgetConfig: (config: BudgetConfig) => void;
}

type PlanningTab = 'visao' | 'renda' | 'categorias' | 'cartoes' | 'notas';

const TABS: { id: PlanningTab; label: string }[] = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'renda', label: 'Despesas & renda' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'cartoes', label: 'Cartões' },
  { id: 'notas', label: 'Notas' },
];

/** Fração da sobra da renda que se considera saudável guardar por mês. */
const HEALTHY_SAVINGS_SHARE = 0.3;

export const PlanejamentoTab: React.FC<PlanejamentoTabProps> = ({
  transactions,
  tags,
  onSaveTag,
  onDeleteTag,
  initialBalance,
  setInitialBalance,
  planningConfig,
  setPlanningConfig,
  cards,
  onSaveCard,
  onDeleteCard,
  budgetConfig,
  setBudgetConfig,
}) => {
  const [activeTab, setActiveTab] = useState<PlanningTab>('visao');

  /* --- Números da faixa de KPIs --- */

  const totalFixedExpenses = round2(planningConfig.fixedExpenses.reduce((sum, e) => sum + e.value, 0));
  const remaining = round2(planningConfig.fixedRevenue - totalFixedExpenses);

  // Quanto da renda sobra depois das despesas fixas. É um número diferente do
  // gasto diário, que vem do orçamento das categorias.
  let availableStatus: KpiStatus = 'neutral';
  if (planningConfig.fixedRevenue > 0) {
    if (remaining <= 0) availableStatus = 'bad';
    else if (remaining < planningConfig.fixedRevenue * 0.3) availableStatus = 'warn';
    else availableStatus = 'good';
  }

  const budgeted = budgetedCategories(tags);
  const monthlyBudget = monthlyBudgetTotal(tags);
  const dailyFromCategories = dailyBudgetFrom(tags, budgetConfig);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonthStr));
  const totalEconomias = round2(
    monthTransactions.filter((t) => t.type === 'economia').reduce((sum, t) => sum + t.value, 0),
  );

  const savingsTarget = round2(Math.max(0, remaining) * HEALTHY_SAVINGS_SHARE);
  const savingsProgress = savingsTarget > 0 ? totalEconomias / savingsTarget : 0;

  let savingsStatus: KpiStatus = 'neutral';
  if (savingsTarget > 0) {
    if (savingsProgress >= 1) savingsStatus = 'good';
    else if (savingsProgress >= 0.5) savingsStatus = 'warn';
    else savingsStatus = 'bad';
  }

  /* --- Selo de progresso, mantido da versão anterior --- */

  let badgeName = 'Nenhum';
  let badgeColor = 'text-neutral-08 border-neutral-03 bg-neutral-02/10';
  let badgeLabel = 'Sem investimentos';
  let badgeIcon = <Target size={16} className="text-neutral-08" />;

  if (totalEconomias > 0) {
    if (savingsProgress >= 1.5) {
      badgeName = 'Void';
      badgeColor = 'text-main border-main/30 bg-main/10 shadow-[0_0_15px_rgba(254,247,175,0.15)]';
      badgeLabel = 'Elite financeira';
      badgeIcon = <Zap size={16} className="text-main animate-premium-icon" />;
    } else if (savingsProgress >= 1) {
      badgeName = 'Alta performance';
      badgeColor = 'text-amber-500 border-amber-500/20 bg-amber-500/10 dark:text-amber-400';
      badgeLabel = 'Meta superada';
      badgeIcon = <Sparkles size={16} className="text-amber-500 dark:text-amber-400 animate-premium-icon" />;
    } else if (savingsProgress >= 0.5) {
      badgeName = 'Consistência';
      badgeColor = 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10 dark:text-emerald-400';
      badgeLabel = 'Foco mantido';
      badgeIcon = <Award size={16} className="text-emerald-500 dark:text-emerald-400" />;
    } else {
      badgeName = 'Foco';
      badgeColor = 'text-violet-500 border-violet-500/20 bg-violet-500/10 dark:text-violet-400';
      badgeLabel = 'Primeiros passos';
      badgeIcon = <TrendingUp size={16} className="text-violet-500 dark:text-violet-400" />;
    }
  }

  const savingsBarTone =
    savingsStatus === 'good' ? 'bg-emerald-500' : savingsStatus === 'warn' ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="space-y-5 pb-24 mx-auto w-full max-w-6xl">
      <div>
        <h2 className="text-xl font-bold font-albert-sans text-neutral-11">Planejamento</h2>
        <p className="text-xs text-neutral-08 mt-1">
          Configure uma vez, acompanhe todo mês. Estes números alimentam a projeção do calendário.
        </p>
      </div>

      {/* Faixa de KPIs — o status do plano, sempre visível acima das abas. */}
      <div className="grid grid-cols-2 desktop:grid-cols-4 gap-4">
        <KpiCard
          label="Saldo inicial"
          value={formatBRL(initialBalance)}
          context="Âncora da projeção diária"
          icon={Wallet}
        />
        <KpiCard
          label="Orçamento disponível"
          value={formatBRL(remaining)}
          context={
            planningConfig.fixedRevenue > 0
              ? `${formatBRL(planningConfig.fixedRevenue)} de renda − ${formatBRL(totalFixedExpenses)} de fixas`
              : 'Cadastre sua renda em Despesas & renda'
          }
          icon={Layers}
          status={availableStatus}
        />
        <KpiCard
          label="Gasto diário sugerido"
          value={formatBRL(dailyFromCategories)}
          context={
            budgeted.length > 0
              ? `${formatBRL(monthlyBudget)} em ${budgeted.length} ${budgeted.length === 1 ? 'categoria' : 'categorias'} ÷ ${budgetConfig.daysDivisor} dias`
              : 'Defina um orçamento nas categorias'
          }
          icon={Target}
          status={dailyFromCategories > 0 ? 'neutral' : 'warn'}
        />
        <KpiCard
          label="Meta de economia"
          value={savingsTarget > 0 ? `${Math.round(savingsProgress * 100)}%` : '—'}
          context={
            savingsTarget > 0
              ? `${formatBRL(totalEconomias)} de ${formatBRL(savingsTarget)} este mês`
              : 'Depende da sua renda e despesas fixas'
          }
          icon={PiggyBank}
          status={savingsStatus}
          progress={savingsTarget > 0 ? savingsProgress : undefined}
        />
      </div>

      {/* Abas — cada uma cabe sem exigir scroll longo. */}
      <div className="flex items-center gap-1 p-1 rounded-2xl border border-neutral-03/80 bg-neutral-01 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'visao' && (
        <div className="grid grid-cols-1 desktop:grid-cols-[1.4fr_1fr] gap-4 items-start">
          <div className="card-premium p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-02 pb-3">
              <h3 className="text-base font-bold font-albert-sans text-neutral-11">Meta de economia</h3>
              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${badgeColor}`}>
                {badgeIcon}
                <span>{badgeName}</span>
                <span className="text-[10px] opacity-75">({badgeLabel})</span>
              </div>
            </div>

            <p className="text-sm text-neutral-11">
              Guardar <strong>{formatBRL(savingsTarget)}</strong> este mês mantém você em{' '}
              {Math.round(HEALTHY_SAVINGS_SHARE * 100)}% da sobra da renda.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-neutral-10 tabular-nums">
                  Economizado: {formatBRL(totalEconomias)}
                </span>
                <span className="text-neutral-11 tabular-nums">
                  {savingsTarget > 0 ? `${Math.round(savingsProgress * 100)}% da meta` : '—'}
                </span>
              </div>

              <div className="w-full h-2.5 bg-neutral-02 rounded-full overflow-hidden border border-neutral-03/40">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${savingsBarTone}`}
                  style={{ width: `${Math.min(100, Math.max(0, savingsProgress * 100))}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-08">
                {savingsProgress >= 1
                  ? 'Meta batida. O que passar daqui vira folga no mês seguinte.'
                  : `Faltam ${formatBRL(Math.max(0, round2(savingsTarget - totalEconomias)))} para a meta.`}
              </p>
            </div>
          </div>

          {/* De onde sai o gasto diário — a única fonte desse número. */}
          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center gap-2 text-neutral-11 border-b border-neutral-02 pb-3">
              <Target size={18} className="text-neutral-08" />
              <h3 className="text-base font-bold font-albert-sans">Previsão de diário</h3>
            </div>

            {budgeted.length === 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] text-neutral-08 leading-relaxed">
                  Nenhuma categoria com orçamento. Sem isso o calendário não estima gasto nos dias
                  futuros e a projeção fica parada.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('categorias')}
                  className="btn-filled w-full py-2.5 text-xs rounded-xl"
                >
                  Definir orçamentos
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {budgeted.map((category) => (
                    <div key={category.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-neutral-10 truncate">{category.name}</span>
                      </span>
                      <span className="font-semibold text-neutral-11 tabular-nums flex-shrink-0">
                        {formatBRL(category.monthlyBudget ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-neutral-02 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-08">Total no mês</span>
                    <span className="font-semibold text-neutral-11 tabular-nums">{formatBRL(monthlyBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-08">÷ {budgetConfig.daysDivisor} dias</span>
                    <span className="font-bold text-neutral-11 tabular-nums">{formatBRL(dailyFromCategories)}/dia</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'renda' && (
        <IncomeSection
          planningConfig={planningConfig}
          setPlanningConfig={setPlanningConfig}
          initialBalance={initialBalance}
          setInitialBalance={setInitialBalance}
        />
      )}

      {activeTab === 'categorias' && (
        <CategoriesSection
          tags={tags}
          onSaveTag={onSaveTag}
          onDeleteTag={onDeleteTag}
          budgetConfig={budgetConfig}
          setBudgetConfig={setBudgetConfig}
        />
      )}

      {activeTab === 'cartoes' && (
        <div className="grid grid-cols-1 desktop:grid-cols-[1.6fr_1fr] gap-4 items-start">
          <CardsSection cards={cards} onSaveCard={onSaveCard} onDeleteCard={onDeleteCard} />

          <div className="card-premium p-5 space-y-3">
            <div className="flex items-center gap-2 text-neutral-11 border-b border-neutral-02 pb-3">
              <CreditCard size={18} className="text-neutral-08" />
              <h3 className="text-base font-bold font-albert-sans">Como a fatura é calculada</h3>
            </div>
            <p className="text-[11px] text-neutral-08 leading-relaxed">
              Uma compra no crédito não sai do saldo no dia em que foi feita. O app olha o
              <strong className="text-neutral-11"> dia de fechamento</strong> para descobrir em qual
              fatura ela cai, e desconta o valor só no
              <strong className="text-neutral-11"> dia de vencimento</strong> dessa fatura.
            </p>
            <p className="text-[11px] text-neutral-08 leading-relaxed">
              Compras feitas a partir do próprio dia de fechamento já entram na fatura seguinte.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'notas' && (
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-neutral-08 mb-3">
            <FileText size={14} />
            <span className="text-[11px]">Anotações livres, sem relação com o cálculo do saldo.</span>
          </div>
          <NotesSection />
        </div>
      )}
    </div>
  );
};
