import React, { useState } from 'react';
import { Palette, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { BudgetConfig, Tag } from '../../types';
import { dailyBudgetFrom, formatBRL, monthlyBudgetTotal, parseAmount, round2 } from '../../core';
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_LABELS,
  DEFAULT_CATEGORY_ICON,
  categoryIcon,
  type CategoryIconKey,
} from '../../config/categoryIcons';

interface CategoriesSectionProps {
  tags: Tag[];
  onSaveTag: (tag: Omit<Tag, 'id'> & { id?: string }) => void;
  onDeleteTag: (id: string) => void;
  budgetConfig: BudgetConfig;
  setBudgetConfig: (config: BudgetConfig) => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#14B8A6', '#84CC16', '#F43F5E', '#6B7280', '#78350F',
];

const field =
  'w-full px-3 py-2.5 rounded-xl border border-neutral-03 bg-neutral-01 text-sm text-neutral-11 focus:outline-none focus:border-neutral-11 transition-colors';

interface Draft {
  id?: string;
  name: string;
  color: string;
  icon: CategoryIconKey;
  monthlyBudget: string;
}

const emptyDraft: Draft = {
  id: undefined,
  name: '',
  color: PRESET_COLORS[0],
  icon: DEFAULT_CATEGORY_ICON,
  monthlyBudget: '',
};

/**
 * Lista única de categorias.
 *
 * Antes existiam duas: as tags que etiquetam movimentações e as categorias de
 * orçamento — com nomes repetidos e nenhuma ligação entre si. Agora é uma só, e
 * o orçamento mensal é um campo opcional dela: preenchido, a categoria entra na
 * previsão de diário; vazio, ela continua servindo só como etiqueta.
 */
export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  tags,
  onSaveTag,
  onDeleteTag,
  budgetConfig,
  setBudgetConfig,
}) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const total = monthlyBudgetTotal(tags);
  const daily = dailyBudgetFrom(tags, budgetConfig);

  const filtered = search.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : tags;

  const openNew = () => {
    setDraft({ ...emptyDraft });
    setError('');
  };

  const openEdit = (tag: Tag) => {
    setDraft({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      icon: (tag.icon as CategoryIconKey) ?? DEFAULT_CATEGORY_ICON,
      monthlyBudget: tag.monthlyBudget ? String(tag.monthlyBudget) : '',
    });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    const name = draft.name.trim();
    if (!name) {
      setError('Dê um nome à categoria.');
      return;
    }

    const duplicate = tags.some(
      (t) => t.id !== draft.id && t.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setError('Já existe uma categoria com esse nome.');
      return;
    }

    const parsed = parseAmount(draft.monthlyBudget);
    const payload: Omit<Tag, 'id'> & { id?: string } = {
      id: draft.id,
      name,
      color: draft.color,
      icon: draft.icon,
      // Sem valor, a categoria fica só como etiqueta e não entra na previsão.
      monthlyBudget: parsed !== null && parsed > 0 ? round2(parsed) : 0,
    };

    onSaveTag(payload);
    setDraft(null);
    setError('');
  };

  return (
    <div className="space-y-4">
      {/* Resumo do que essa lista produz: o gasto diário sugerido. */}
      <div className="card-premium p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-bold text-neutral-08 uppercase tracking-wider block">
            Gasto diário sugerido
          </span>
          <p className="text-[11px] text-neutral-08 tabular-nums">
            {formatBRL(total)} orçados no mês ÷ {budgetConfig.daysDivisor} dias
          </p>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <label className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-08 uppercase font-bold tracking-wider">Dividir por</span>
            <input
              type="number"
              min={1}
              max={31}
              value={budgetConfig.daysDivisor}
              onChange={(e) =>
                setBudgetConfig({
                  ...budgetConfig,
                  daysDivisor: Math.min(31, Math.max(1, Number(e.target.value) || 30)),
                })
              }
              className="w-14 px-2 py-1.5 rounded-lg border border-neutral-03 bg-neutral-01 text-sm font-semibold text-neutral-11 tabular-nums text-center focus:outline-none focus:border-neutral-11"
              aria-label="Divisor de dias"
            />
          </label>
          <span className="text-2xl font-semibold font-albert-sans text-neutral-11 tabular-nums">
            {formatBRL(daily)}
          </span>
        </div>
      </div>

      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-02 pb-3">
          <h3 className="text-base font-bold font-albert-sans text-neutral-11">
            Categorias
            <span className="ml-2 text-xs font-normal text-neutral-08">{tags.length}</span>
          </h3>

          <div className="flex items-center gap-2">
            {tags.length > 6 && (
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-08 pointer-events-none">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-36 pl-8 pr-3 py-2 rounded-xl border border-neutral-03 bg-neutral-01 text-xs text-neutral-11 focus:outline-none focus:border-neutral-11"
                />
              </div>
            )}
            <button
              type="button"
              onClick={openNew}
              className="btn-filled px-3 py-2 text-xs rounded-xl flex-shrink-0"
            >
              <Plus size={14} />
              Nova
            </button>
          </div>
        </div>

        {/* Formulário só aparece sob demanda — a lista é o estado padrão. */}
        {draft && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-neutral-03 bg-neutral-01/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-10 uppercase tracking-wide">
                {draft.id ? 'Editar categoria' : 'Nova categoria'}
              </span>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="p-1 rounded-lg text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 transition-colors"
                aria-label="Cancelar"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 tablet:grid-cols-[1fr_10rem] gap-2">
              <input
                type="text"
                maxLength={24}
                placeholder="Nome (ex: Alimentação)"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
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
                  placeholder="Orçamento/mês"
                  value={draft.monthlyBudget}
                  onChange={(e) => setDraft({ ...draft, monthlyBudget: e.target.value })}
                  className={`${field} pl-9 tabular-nums`}
                />
              </div>
            </div>

            <p className="text-[10px] text-neutral-08 leading-relaxed">
              O orçamento é opcional. Preenchido, esta categoria entra no cálculo do gasto diário;
              em branco, ela serve apenas para etiquetar movimentações.
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(CATEGORY_ICONS) as CategoryIconKey[]).map((key) => {
                const Icon = CATEGORY_ICONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: key })}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                      draft.icon === key
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

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraft({ ...draft, color })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    draft.color === color ? 'border-neutral-11 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
              <label
                className="w-7 h-7 rounded-full border border-neutral-03 flex items-center justify-center cursor-pointer transition-all hover:scale-110 bg-neutral-01 hover:border-neutral-11 relative"
                title="Cor personalizada"
              >
                <Palette size={13} className="text-neutral-08" />
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>

            {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}

            <button type="submit" className="btn-filled-main w-full py-2.5 text-xs rounded-xl">
              {draft.id ? 'Salvar categoria' : 'Criar categoria'}
            </button>
          </form>
        )}

        {tags.length === 0 ? (
          <p className="text-[11px] text-neutral-08 py-6 text-center leading-relaxed">
            Nenhuma categoria ainda. Crie uma para agrupar seus gastos e, se quiser, definir quanto
            espera gastar nela por mês.
          </p>
        ) : (
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-2">
            {filtered.map((tag) => {
              const Icon = categoryIcon(tag.icon);
              const budgeted = (tag.monthlyBudget ?? 0) > 0;

              return (
                <div
                  key={tag.id}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-neutral-02 bg-neutral-01/40 group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0"
                    style={{
                      backgroundColor: `${tag.color}15`,
                      borderColor: `${tag.color}30`,
                      color: tag.color,
                    }}
                  >
                    <Icon size={14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-11 truncate">{tag.name}</p>
                    <p className="text-[10px] text-neutral-08 tabular-nums">
                      {budgeted ? `${formatBRL(tag.monthlyBudget ?? 0)}/mês` : 'sem orçamento'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEdit(tag)}
                    className="p-1.5 rounded-lg text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 transition-colors"
                    title={`Editar ${tag.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir a categoria "${tag.name}"? Ela será desvinculada das movimentações existentes.`)) {
                        onDeleteTag(tag.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-neutral-08 hover:text-rose-500 transition-colors"
                    title={`Excluir ${tag.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="text-[11px] text-neutral-08 py-4 col-span-full text-center">
                Nenhuma categoria com esse nome.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
