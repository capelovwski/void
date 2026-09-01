import React, { useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import type { BudgetCategory, BudgetConfig } from '../../types';
import { dailyBudgetFrom, formatBRL, monthlyBudgetTotal, parseAmount, round2 } from '../../core';
import { CATEGORY_ICONS, CATEGORY_ICON_LABELS, categoryIcon, type CategoryIconKey } from '../../config/categoryIcons';

interface BudgetSectionProps {
  budgetConfig: BudgetConfig;
  setBudgetConfig: (config: BudgetConfig) => void;
}

const field =
  'w-full px-3 py-2.5 rounded-xl border border-neutral-03 bg-neutral-01 text-sm text-neutral-11 focus:outline-none focus:border-neutral-11 transition-colors';

/**
 * Previsão de diário: o usuário cadastra quanto espera gastar por mês em cada
 * categoria, e o total dividido por um número de dias vira o gasto diário
 * sugerido. Esse valor é a referência do "diário médio" e da previsão dos dias
 * que ainda não aconteceram — ele orienta, nunca bloqueia um lançamento.
 */
export const BudgetSection: React.FC<BudgetSectionProps> = ({ budgetConfig, setBudgetConfig }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [icon, setIcon] = useState<CategoryIconKey>('shopping');
  const [error, setError] = useState('');

  // Texto em edição de cada categoria. Sem isso, digitar "1,5" quebraria no
  // separador: o valor já parseado voltaria como "1" e comeria a vírgula.
  const [edits, setEdits] = useState<Record<string, string>>({});

  const total = monthlyBudgetTotal(budgetConfig);
  const daily = dailyBudgetFrom(budgetConfig);

  const update = (patch: Partial<BudgetConfig>) => setBudgetConfig({ ...budgetConfig, ...patch });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = parseAmount(value);
    if (!name.trim()) {
      setError('Dê um nome à categoria.');
      return;
    }
    if (parsed === null || parsed <= 0) {
      setError('Informe um valor mensal maior que zero.');
      return;
    }

    const category: BudgetCategory = {
      id: `budget-${Date.now()}`,
      name: name.trim(),
      monthlyValue: round2(parsed),
      icon,
    };

    update({ categories: [...budgetConfig.categories, category] });
    setName('');
    setValue('');
    setError('');
  };

  const handleRemove = (id: string) => {
    update({ categories: budgetConfig.categories.filter((c) => c.id !== id) });
  };

  const handleValueChange = (id: string, raw: string) => {
    setEdits((prev) => ({ ...prev, [id]: raw }));
    const parsed = parseAmount(raw);
    update({
      categories: budgetConfig.categories.map((c) =>
        c.id === id ? { ...c, monthlyValue: parsed === null ? 0 : round2(parsed) } : c,
      ),
    });
  };

  return (
    <div className="card-premium p-6 space-y-5">
      <div className="flex items-center gap-2 text-neutral-11 border-b border-neutral-02 pb-3">
        <Target size={18} className="text-neutral-08" />
        <h3 className="text-base font-bold font-albert-sans">Previsão de diário</h3>
      </div>

      {/* O resultado vem primeiro: é o número que a pessoa veio conferir. */}
      <div className="rounded-2xl border border-neutral-03/70 bg-neutral-01 p-5 flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-bold text-neutral-08 uppercase tracking-wider block">
            Gasto diário sugerido
          </span>
          <p className="text-[11px] text-neutral-08 tabular-nums">
            {formatBRL(total)} por mês ÷ {budgetConfig.daysDivisor || 30} dias
          </p>
        </div>
        <span className="text-2xl font-semibold font-albert-sans text-neutral-11 tabular-nums flex-shrink-0">
          {formatBRL(daily)}
        </span>
      </div>

      {budgetConfig.categories.length > 0 && (
        <div className="space-y-1.5">
          {budgetConfig.categories.map((category) => {
            const Icon = categoryIcon(category.icon);
            return (
              <div
                key={category.id}
                className="flex items-center gap-2.5 p-2 rounded-xl border border-neutral-02 bg-neutral-01/40"
              >
                <span className="w-8 h-8 rounded-lg bg-neutral-02 text-neutral-10 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} />
                </span>
                <span className="flex-1 min-w-0 text-xs font-medium text-neutral-11 truncate">
                  {category.name}
                </span>
                <div className="relative w-28 flex-shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-neutral-08 pointer-events-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={edits[category.id] ?? String(category.monthlyValue)}
                    onChange={(e) => handleValueChange(category.id, e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-neutral-03 bg-neutral-00 text-xs font-semibold text-neutral-11 tabular-nums text-right focus:outline-none focus:border-neutral-11"
                    aria-label={`Valor mensal de ${category.name}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(category.id)}
                  className="p-1.5 rounded-lg text-neutral-08 hover:text-rose-500 transition-colors flex-shrink-0"
                  title={`Remover ${category.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-3 pt-3 border-t border-neutral-02">
        <span className="text-xs font-bold text-neutral-10 uppercase tracking-wide block">Nova categoria</span>

        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <input
            type="text"
            maxLength={24}
            placeholder="Ex: Alimentação"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-08 pointer-events-none">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`${field} pl-9 tabular-nums`}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 tablet:grid-cols-10 gap-1.5">
          {(Object.keys(CATEGORY_ICONS) as CategoryIconKey[]).map((key) => {
            const Icon = CATEGORY_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${
                  icon === key
                    ? 'bg-neutral-12 text-neutral-00 border-neutral-12'
                    : 'border-neutral-03 text-neutral-08 hover:text-neutral-11 hover:bg-neutral-01'
                }`}
                title={CATEGORY_ICON_LABELS[key]}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>

        {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}

        <button type="submit" className="btn-filled w-full py-2.5 text-xs rounded-xl">
          <Plus size={14} />
          Adicionar categoria
        </button>
      </form>

      <label className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-02">
        <span className="text-xs text-neutral-10 leading-snug">
          Dividir por
          <span className="block text-[10px] text-neutral-08">
            Fixo em vez dos dias do mês, para a meta não oscilar entre fevereiro e março.
          </span>
        </span>
        <input
          type="number"
          min={1}
          max={31}
          value={budgetConfig.daysDivisor}
          onChange={(e) => update({ daysDivisor: Math.min(31, Math.max(1, Number(e.target.value) || 30)) })}
          className="w-16 px-2 py-2 rounded-xl border border-neutral-03 bg-neutral-01 text-sm font-semibold text-neutral-11 tabular-nums text-center focus:outline-none focus:border-neutral-11 flex-shrink-0"
        />
      </label>
    </div>
  );
};
