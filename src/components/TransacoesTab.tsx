import React, { useState } from 'react';
import { Search, Filter, Trash2, Calendar, CreditCard, ArrowUpRight, ArrowDownRight, PiggyBank, Edit3, Briefcase, Columns, Receipt } from 'lucide-react';
import type { Transaction, Tag, TransactionType } from '../types';
import { CATEGORY_ICONS } from './PlanejamentoTab';

interface TransacoesTabProps {
  transactions: Transaction[];
  tags: Tag[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const TransacoesTab: React.FC<TransacoesTabProps> = ({
  transactions,
  tags,
  onDeleteTransaction,
  onEditTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'todos'>('todos');
  const [tagFilter, setTagFilter] = useState<string | 'todos'>('todos');
  const [viewMode, setViewMode] = useState<'cards' | 'typographic'>('cards');

  // Helper to format date strings for readability
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter transactions
  const filteredTransactions = transactions
    .filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.value.toString().includes(searchTerm);
      const matchesType = typeFilter === 'todos' || t.type === typeFilter;
      const matchesTag = tagFilter === 'todos' || t.tagId === tagFilter;
      
      return matchesSearch && matchesType && matchesTag;
    })
    // Sort transactions by date descending
    .sort((a, b) => b.date.localeCompare(a.date));

  const getTagDetails = (tagId?: string) => {
    return tags.find((t) => t.id === tagId);
  };

  const getIconClass = (type: TransactionType) => {
    switch (type) {
      case 'entrada': return { icon: <ArrowUpRight className="text-success" size={16} />, bg: 'bg-success/10' };
      case 'saida': return { icon: <ArrowDownRight className="text-red-500" size={16} />, bg: 'bg-red-500/10' };
      case 'fatura': return { icon: <CreditCard className="text-amber-500" size={16} />, bg: 'bg-amber-500/10' };
      case 'economia': return { icon: <PiggyBank className="text-violet-500 dark:text-violet-400" size={16} />, bg: 'bg-violet-500/10 dark:bg-violet-400/10' };
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Search and Filters Card */}
      <div className="card-premium p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-02 pb-3">
          <h2 className="text-xl font-bold font-albert-sans text-neutral-11">
            Histórico de Movimentações
          </h2>
          
          {/* View Mode Toggle */}
          <div className="flex bg-neutral-01 p-1 rounded-xl border border-neutral-03/80">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                  : 'text-neutral-08 hover:text-neutral-11'
              }`}
              title="Visualização em Cards"
            >
              <Columns size={12} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('typographic')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'typographic'
                  ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                  : 'text-neutral-08 hover:text-neutral-11'
              }`}
              title="Extrato Tipográfico v2"
            >
              <Receipt size={12} />
              Extrato v2
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 tablet:grid-cols-3 gap-3">
          {/* Search bar */}
          <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Buscar por descrição ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-sm text-neutral-11 focus:outline-none placeholder-neutral-06"
            />
          </div>

          {/* Type Filter */}
          <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
              <Filter size={18} />
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-sm text-neutral-11 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="todos">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas (Débito)</option>
              <option value="fatura">Faturas (Crédito)</option>
              <option value="economia">Economias</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
              <Filter size={18} />
            </span>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-sm text-neutral-11 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="todos">Todas as tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-08 font-bold uppercase tracking-wider px-1">
          <span>Movimentação</span>
          <span>{filteredTransactions.length} itens encontrados</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="card-premium py-12 text-center text-neutral-08 text-sm">
            Nenhuma transação encontrada com os filtros atuais.
          </div>
        ) : viewMode === 'typographic' ? (
          /* Typographic High-Density Statement (v2) */
          <div className="bg-neutral-00 rounded-2xl border border-neutral-03/80 shadow-sm overflow-hidden divide-y divide-neutral-02">
            {filteredTransactions.map((t) => {
              const tag = getTagDetails(t.tagId);
              const iconInfo = getIconClass(t.type);

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2.5 px-4 gap-4 hover:bg-neutral-01/50 transition-colors group text-xs"
                >
                  {/* Left Column: Date & Type Icon */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-neutral-08 text-[11px] select-none flex-shrink-0 w-20">
                      {t.date.split('-').reverse().slice(0, 2).join('/')}
                    </span>
                    
                    <div className="text-neutral-08 flex-shrink-0">
                      {iconInfo?.icon}
                    </div>

                    {/* Middle Column: Description & Tag */}
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="font-semibold text-neutral-11 truncate">
                        {t.description}
                      </span>
                      {tag && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 flex-shrink-0"
                          style={{ borderColor: tag.color + '40', backgroundColor: tag.color + '10', color: tag.color }}
                        >
                          {(() => {
                            const IconComponent = CATEGORY_ICONS[tag.icon as keyof typeof CATEGORY_ICONS] || Briefcase;
                            return <IconComponent size={8} />;
                          })()}
                          <span>{tag.name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Value, Type, Actions */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right w-28">
                      <span className={`font-mono font-bold text-[13px] ${
                        t.type === 'entrada'
                          ? 'text-success'
                          : t.type === 'economia'
                          ? 'text-violet-500 dark:text-violet-400'
                          : 'text-neutral-11'
                      }`}>
                        {t.type === 'entrada' ? '+' : '-'} R$ {t.value.toFixed(2)}
                      </span>
                    </div>

                    {/* Actions on hover */}
                    <div className="flex gap-1 opacity-80 tablet:opacity-0 group-hover:opacity-100 transition-opacity w-14 justify-end">
                      <button
                        onClick={() => onEditTransaction(t)}
                        title="Editar"
                        className="p-1 rounded text-neutral-08 hover:bg-neutral-02 hover:text-neutral-11 transition-all"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta transação?')) {
                            onDeleteTransaction(t.id);
                          }
                        }}
                        title="Excluir"
                        className="p-1 rounded text-red-500/80 dark:text-red-400/80 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Cards View Mode with Category Icons */
          <div className="space-y-3">
            {filteredTransactions.map((t) => {
              const tag = getTagDetails(t.tagId);
              const iconInfo = getIconClass(t.type);

              return (
                <div
                  key={t.id}
                  className="card-premium p-4 flex items-center justify-between gap-4 hover:border-neutral-06 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2.5 rounded-xl border border-neutral-02 bg-neutral-00 ${iconInfo?.bg}`}>
                      {iconInfo?.icon}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-11 truncate max-w-[200px] tablet:max-w-md">
                        {t.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-neutral-08 font-medium flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(t.date)}
                        </span>
                        {tag && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1.5"
                            style={{ borderColor: tag.color + '40', backgroundColor: tag.color + '10', color: tag.color }}
                          >
                            {(() => {
                              const IconComponent = CATEGORY_ICONS[tag.icon as keyof typeof CATEGORY_ICONS] || Briefcase;
                              return <IconComponent size={10} />;
                            })()}
                            {tag.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-base font-bold font-albert-sans ${
                        t.type === 'entrada'
                          ? 'text-success'
                          : t.type === 'economia'
                          ? 'text-violet-500 dark:text-violet-400'
                          : 'text-neutral-11'
                      }`}>
                        {t.type === 'entrada' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-neutral-08 font-semibold capitalize">
                        {t.type === 'fatura' ? 'Crédito' : t.type}
                      </span>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex gap-1.5 opacity-80 tablet:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTransaction(t)}
                        title="Editar"
                        className="p-2 rounded-lg text-neutral-09 hover:bg-neutral-02 hover:text-neutral-11 transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta transação?')) {
                            onDeleteTransaction(t.id);
                          }
                        }}
                        title="Excluir"
                        className="p-2 rounded-lg text-red-500/80 dark:text-red-400/80 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
