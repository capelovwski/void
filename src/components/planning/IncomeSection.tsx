import React, { useState } from 'react';
import { Check, Plus, Trash2, Wallet, X } from 'lucide-react';
import type { FixedExpense, PlanningConfig } from '../../types';
import { formatBRL, parseAmount, round2 } from '../../core';

interface IncomeSectionProps {
  planningConfig: PlanningConfig;
  setPlanningConfig: (config: PlanningConfig) => void;
  initialBalance: number;
  setInitialBalance: (balance: number) => void;
}

const field =
  'w-full px-3 py-2.5 rounded-xl border border-neutral-03 bg-neutral-01 text-sm text-neutral-11 focus:outline-none focus:border-neutral-11 transition-colors';

/**
 * Renda fixa, despesas fixas e saldo inicial.
 *
 * Esses números respondem "quanto sobra da minha renda" — deliberadamente
 * separado do gasto diário sugerido, que sai do orçamento das categorias. Antes
 * os dois cálculos apareciam no mesmo card e pareciam ser o mesmo número.
 */
export const IncomeSection: React.FC<IncomeSectionProps> = ({
  planningConfig,
  setPlanningConfig,
  initialBalance,
  setInitialBalance,
}) => {
  const [revenueInput, setRevenueInput] = useState(String(planningConfig.fixedRevenue || ''));
  const [walletInput, setWalletInput] = useState(String(initialBalance || ''));
  const [walletSaved, setWalletSaved] = useState(false);

  const [expenseDraft, setExpenseDraft] = useState<{ name: string; value: string } | null>(null);
  const [error, setError] = useState('');

  const totalFixedExpenses = round2(
    planningConfig.fixedExpenses.reduce((sum, e) => sum + e.value, 0),
  );
  const remaining = round2(planningConfig.fixedRevenue - totalFixedExpenses);

  const handleRevenueChange = (raw: string) => {
    setRevenueInput(raw);
    const parsed = parseAmount(raw);
    setPlanningConfig({ ...planningConfig, fixedRevenue: parsed === null ? 0 : round2(parsed) });
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAmount(walletInput);
    if (parsed === null) return;
    setInitialBalance(round2(parsed));
    setWalletSaved(true);
    window.setTimeout(() => setWalletSaved(false), 2000);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDraft) return;

    const parsed = parseAmount(expenseDraft.value);
    if (!expenseDraft.name.trim()) {
      setError('Dê um nome à despesa.');
      return;
    }
    if (parsed === null || parsed <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    const newExpense: FixedExpense = {
      id: `fe-${Date.now()}`,
      name: expenseDraft.name.trim(),
      value: round2(parsed),
    };

    setPlanningConfig({
      ...planningConfig,
      fixedExpenses: [...planningConfig.fixedExpenses, newExpense],
    });
    setExpenseDraft(null);
    setError('');
  };

  const handleDeleteExpense = (id: string) => {
    setPlanningConfig({
      ...planningConfig,
      fixedExpenses: planningConfig.fixedExpenses.filter((e) => e.id !== id),
    });
  };

  return (
    <div className="grid grid-cols-1 desktop:grid-cols-[1.6fr_1fr] gap-4 items-start">
      {/* Renda e despesas fixas */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-02 pb-3">
          <h3 className="text-base font-bold font-albert-sans text-neutral-11">Renda e despesas fixas</h3>
          <button
            type="button"
            onClick={() => {
              setExpenseDraft({ name: '', value: '' });
              setError('');
            }}
            className="btn-filled px-3 py-2 text-xs rounded-xl flex-shrink-0"
          >
            <Plus size={14} />
            Despesa
          </button>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-10">Receita mensal fixa</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-08 pointer-events-none">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={revenueInput}
              onChange={(e) => handleRevenueChange(e.target.value)}
              className={`${field} pl-9 tabular-nums font-semibold`}
            />
          </div>
        </label>

        {expenseDraft && (
          <form
            onSubmit={handleAddExpense}
            className="rounded-2xl border border-neutral-03 bg-neutral-01/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-10 uppercase tracking-wide">Nova despesa fixa</span>
              <button
                type="button"
                onClick={() => setExpenseDraft(null)}
                className="p-1 rounded-lg text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 transition-colors"
                aria-label="Cancelar"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 tablet:grid-cols-[1fr_9rem] gap-2">
              <input
                type="text"
                placeholder="Nome (ex: Aluguel)"
                value={expenseDraft.name}
                onChange={(e) => setExpenseDraft({ ...expenseDraft, name: e.target.value })}
                className={field}
                autoFocus
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-08 pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenseDraft.value}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, value: e.target.value })}
                  className={`${field} pl-9 tabular-nums`}
                />
              </div>
            </div>

            {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}

            <button type="submit" className="btn-filled-main w-full py-2.5 text-xs rounded-xl">
              Incluir despesa
            </button>
          </form>
        )}

        {planningConfig.fixedExpenses.length === 0 ? (
          <p className="text-[11px] text-neutral-08 py-6 text-center">
            Nenhuma despesa fixa cadastrada.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[16rem] overflow-y-auto pr-1 scroll-fade-mask">
            {planningConfig.fixedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-neutral-02 bg-neutral-01/40"
              >
                <span className="text-xs font-medium text-neutral-11 truncate">{expense.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-neutral-11 tabular-nums">
                    {formatBRL(expense.value)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="p-1.5 rounded-lg text-neutral-08 hover:text-rose-500 transition-colors"
                    title={`Remover ${expense.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-neutral-02 flex items-center justify-between text-xs">
          <span className="text-neutral-08">Sobra da renda</span>
          <span
            className={`font-bold tabular-nums ${
              remaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-11'
            }`}
          >
            {formatBRL(remaining)}
          </span>
        </div>
      </div>

      {/* Saldo inicial */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center gap-2 text-neutral-11 border-b border-neutral-02 pb-3">
          <Wallet size={18} className="text-neutral-08" />
          <h3 className="text-base font-bold font-albert-sans">Saldo inicial do mês</h3>
        </div>

        <form onSubmit={handleWalletSubmit} className="space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-08 pointer-events-none">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              className={`${field} pl-9 tabular-nums font-semibold`}
            />
          </div>

          <p className="text-[11px] text-neutral-08 leading-relaxed">
            O saldo que você tinha no primeiro dia deste mês. É a âncora de toda a projeção do
            calendário — os dias seguintes são calculados em cascata a partir dele.
          </p>

          <button type="submit" className="btn-filled w-full py-2.5 text-xs rounded-xl">
            {walletSaved ? <Check size={14} /> : null}
            {walletSaved ? 'Salvo' : 'Salvar saldo inicial'}
          </button>
        </form>
      </div>
    </div>
  );
};
