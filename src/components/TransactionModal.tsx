import React, { useEffect, useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Calendar, Check, CreditCard, FileText, Repeat, Search, X } from 'lucide-react';
import type { Card, Recurrence, Tag, Transaction, TransactionType } from '../types';
import {
  formatBRL,
  invoiceDueDate,
  normalizeType,
  parseAmount,
  round2,
  splitInstallments,
  todayYMD,
} from '../core';
import { TRANSACTION_TYPE_LIST, typeMeta } from '../config/transactionTypes';
import { categoryIcon } from '../config/categoryIcons';
import { useIsMobile } from '../hooks/useBreakpoint';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  tags: Tag[];
  cards: Card[];
  editingTransaction?: Transaction | null;
  defaultDate?: string;
  /** Gasto diário sugerido, mostrado como referência ao lançar um `diario`. */
  dailyBudget: number;
  /** Valor atual do atalho "gasto do dia" por data. */
  quickDailyByDate: Record<string, number>;
  onSetDailySpend: (dateStr: string, value: number) => void;
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'nenhuma', label: 'Não repete' },
  { value: 'diaria', label: 'Diariamente' },
  { value: 'semanal', label: 'Semanalmente' },
  { value: 'mensal', label: 'Mensalmente' },
  { value: 'parcelado', label: 'Parcelado' },
];

const fieldShell =
  'relative rounded-xl border border-neutral-03 bg-neutral-01 overflow-hidden transition-colors focus-within:border-neutral-11';

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tags,
  cards,
  editingTransaction,
  defaultDate,
  dailyBudget,
  quickDailyByDate,
  onSetDailySpend,
}) => {
  const isMobile = useIsMobile();
  const todayStr = todayYMD();

  const [type, setType] = useState<TransactionType>('saida');
  const [valueInput, setValueInput] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [cardId, setCardId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('nenhuma');
  const [installmentCount, setInstallmentCount] = useState(2);
  const [error, setError] = useState('');

  // Enquanto o usuário não mexer no vencimento, ele segue a regra do cartão.
  const [dueDateTouched, setDueDateTouched] = useState(false);

  // Guarda a data junto com o texto: assim, quando a data do lançamento muda, o
  // campo volta sozinho para o valor salvo daquele outro dia, sem efeito nenhum.
  const [quickSpendDraft, setQuickSpendDraft] = useState<{ date: string; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      const tx = editingTransaction;
      setType(normalizeType(tx.type));
      // Num parcelamento o campo de valor edita o total, que é o número que a
      // pessoa realmente tem em mente ("comprei em 10x de tanto").
      setValueInput(String(tx.installmentTotal ?? tx.value));
      setDescription(tx.description);
      setDate(tx.date);
      setPurchaseDate(tx.purchaseDate ?? '');
      setCardId(tx.cardId ?? '');
      setTagIds(tx.tagIds ?? (tx.tagId ? [tx.tagId] : []));
      setRecurrence(tx.recurrence ?? 'nenhuma');
      setInstallmentCount(tx.installmentCount ?? 2);
      setDueDateTouched(true);
    } else {
      const initialDate = defaultDate || todayStr;
      setType('saida');
      setValueInput('');
      setDescription('');
      setDate(initialDate);
      setPurchaseDate(initialDate);
      setCardId('');
      setTagIds([]);
      setRecurrence('nenhuma');
      setInstallmentCount(2);
      setDueDateTouched(false);
    }

    setQuickSpendDraft(null);
    setTagSearch('');
    setError('');
  }, [isOpen, editingTransaction, defaultDate, todayStr]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const meta = typeMeta(type);
  const isCard = type === 'cartao';
  const selectedCard = useMemo(() => cards.find((c) => c.id === cardId), [cards, cardId]);

  /**
   * Vencimento sugerido pela regra do cartão. Fica como valor derivado em vez de
   * um efeito que grava no estado: enquanto ninguém editar o campo, ele
   * acompanha a data da compra e o cartão escolhido.
   */
  const suggestedDueDate = isCard && selectedCard && purchaseDate
    ? invoiceDueDate(purchaseDate, selectedCard)
    : '';
  const effectiveDate = isCard && !dueDateTouched && suggestedDueDate ? suggestedDueDate : date;

  const amount = parseAmount(valueInput);
  const installmentParts = amount !== null && recurrence === 'parcelado' && installmentCount > 0
    ? splitInstallments(amount, installmentCount)
    : null;

  const quickSpendSaved = quickDailyByDate[effectiveDate] ?? 0;
  const quickSpendInput = quickSpendDraft?.date === effectiveDate
    ? quickSpendDraft.text
    : quickSpendSaved > 0
      ? String(quickSpendSaved)
      : '';

  const filteredTags = useMemo(() => {
    const term = tagSearch.trim().toLowerCase();
    if (!term) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(term));
  }, [tags, tagSearch]);

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setError('');
    if (next !== 'cartao') {
      // Sem cartão não existe fatura: a data volta a ser a do próprio lançamento.
      setCardId('');
      setDueDateTouched(true);
    } else if (!purchaseDate) {
      setPurchaseDate(date || todayStr);
    }
  };

  const handleQuickSpendChange = (raw: string) => {
    setQuickSpendDraft({ date: effectiveDate, text: raw });
    onSetDailySpend(effectiveDate, parseAmount(raw) ?? 0);
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (amount === null || amount <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (!effectiveDate) {
      setError(isCard ? 'Escolha o vencimento da fatura.' : 'Escolha uma data.');
      return;
    }
    if (recurrence === 'parcelado' && installmentCount < 2) {
      setError('Um parcelamento precisa de pelo menos 2 parcelas.');
      return;
    }

    const payload: Omit<Transaction, 'id'> & { id?: string } = {
      id: editingTransaction?.id,
      type,
      value: installmentParts ? installmentParts[0] : round2(amount),
      description: description.trim() || meta.label,
      date: effectiveDate,
      recurrence,
      tagIds,
    };

    if (recurrence === 'parcelado') {
      payload.installmentCount = installmentCount;
      // O total fica gravado para a expansão dividir sem perder centavos.
      payload.installmentTotal = round2(amount);
    }
    if (isCard) {
      payload.cardId = cardId || undefined;
      payload.purchaseDate = purchaseDate || undefined;
    }

    onSave(payload);
    onClose();
  };

  const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sheetVariants: Variants = {
    hidden: { y: isMobile ? '100%' : 16, scale: isMobile ? 1 : 0.97, opacity: isMobile ? 1 : 0 },
    visible: {
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', damping: 28, stiffness: 340 },
    },
    exit: {
      y: isMobile ? '100%' : 16,
      scale: isMobile ? 1 : 0.97,
      opacity: isMobile ? 1 : 0,
      transition: { duration: 0.18, ease: 'easeIn' },
    },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end tablet:items-center justify-center p-0 tablet:p-4 bg-overlay-02 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
    >
      <motion.div
        className="relative w-full max-w-lg bg-neutral-00 rounded-t-3xl tablet:rounded-3xl border-t tablet:border border-neutral-03 shadow-2xl overflow-hidden max-h-[92vh] tablet:max-h-[88vh] flex flex-col"
        variants={sheetVariants}
        drag={isMobile ? 'y' : false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_event, info) => {
          if (info.offset.y > 140) onClose();
        }}
      >
        {/* Alça de arrasto — só no mobile, onde a folha é arrastável. */}
        <div className="w-10 h-1.5 bg-neutral-03/80 rounded-full mx-auto my-3 tablet:hidden flex-shrink-0" />

        <div className="flex items-center justify-between px-5 tablet:px-6 pb-4 tablet:pt-6 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold font-albert-sans text-neutral-11">
              {editingTransaction ? 'Editar movimentação' : 'Nova movimentação'}
            </h3>
            <p className="text-[11px] text-neutral-08 mt-0.5">{meta.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 tablet:px-6 pb-6 space-y-6">
          {/* O valor é o protagonista: campo grande, sem moldura pesada. */}
          <div className="flex items-baseline gap-2 border-b border-neutral-02 pb-4">
            <span className="text-2xl font-light text-neutral-08">R$</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={valueInput}
              onChange={(e) => {
                setValueInput(e.target.value);
                setError('');
              }}
              className="flex-1 min-w-0 bg-transparent text-4xl font-semibold font-albert-sans text-neutral-11 tabular-nums tracking-tight focus:outline-none placeholder-neutral-05"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-08 uppercase tracking-wide">Tipo</label>
            <div className="grid grid-cols-5 gap-1.5">
              {TRANSACTION_TYPE_LIST.map((item) => {
                const Icon = item.icon;
                const active = type === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleTypeChange(item.value)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 px-1 transition-all active:scale-95 ${
                      active
                        ? `${item.toneActive} shadow-sm`
                        : `${item.toneBorder} ${item.toneBg} ${item.tone} hover:brightness-95`
                    }`}
                  >
                    <Icon size={17} />
                    <span className="text-[10px] font-semibold leading-none text-center">{item.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cartão: qual cartão, quando comprou e quando vence */}
          {isCard && (
            <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              {cards.length === 0 ? (
                <p className="text-[11px] text-neutral-10 leading-relaxed">
                  Você ainda não cadastrou cartões. Dá para lançar assim mesmo informando o vencimento
                  na mão — cadastre em <strong className="text-neutral-11">Planejamento</strong> para o
                  app calcular a fatura sozinho.
                </p>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="card-select" className="text-xs font-semibold text-neutral-10 block">
                    Cartão
                  </label>
                  <div className={fieldShell}>
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-08 pointer-events-none">
                      <CreditCard size={16} />
                    </span>
                    <select
                      id="card-select"
                      value={cardId}
                      onChange={(e) => {
                        setCardId(e.target.value);
                        setDueDateTouched(false);
                      }}
                      className="w-full pl-10 pr-8 py-2.5 bg-transparent text-sm text-neutral-11 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Sem cartão vinculado</option>
                      {cards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name} — fecha dia {card.closingDay}, vence dia {card.dueDay}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="purchase-date" className="text-xs font-semibold text-neutral-10 block">
                  Data da compra
                </label>
                <div className={fieldShell}>
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-08 pointer-events-none">
                    <Calendar size={16} />
                  </span>
                  <input
                    id="purchase-date"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => {
                      setPurchaseDate(e.target.value);
                      setDueDateTouched(false);
                    }}
                    className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm text-neutral-11 focus:outline-none"
                  />
                </div>
              </div>

              {suggestedDueDate && !dueDateTouched && (
                <p className="text-[11px] text-neutral-10">
                  Cai na fatura que vence em{' '}
                  <strong className="text-neutral-11">
                    {new Date(`${suggestedDueDate}T12:00:00`).toLocaleDateString('pt-BR')}
                  </strong>
                  . Só aí o valor sai do seu saldo.
                </p>
              )}
            </div>
          )}

          {/* Data — do lançamento, ou o vencimento da fatura no caso do cartão */}
          <div className="space-y-2">
            <label htmlFor="date-input" className="text-xs font-semibold text-neutral-08 uppercase tracking-wide block">
              {isCard ? 'Vencimento da fatura' : 'Data'}
            </label>
            <div className={fieldShell}>
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-08 pointer-events-none">
                <Calendar size={16} />
              </span>
              <input
                id="date-input"
                type="date"
                value={effectiveDate}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDueDateTouched(true);
                  setError('');
                }}
                className="w-full pl-10 pr-3 py-3 bg-transparent text-sm text-neutral-11 focus:outline-none"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label htmlFor="desc-input" className="text-xs font-semibold text-neutral-08 uppercase tracking-wide block">
              Descrição
            </label>
            <div className={fieldShell}>
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-08 pointer-events-none">
                <FileText size={16} />
              </span>
              <input
                id="desc-input"
                type="text"
                placeholder={isCard ? 'Ex: Mercado no crédito' : 'Ex: Supermercado, Salário...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-transparent text-sm text-neutral-11 focus:outline-none placeholder-neutral-06"
              />
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-2">
            <label htmlFor="recurrence-select" className="text-xs font-semibold text-neutral-08 uppercase tracking-wide block">
              Repetição
            </label>
            <div className={fieldShell}>
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-08 pointer-events-none">
                <Repeat size={16} />
              </span>
              <select
                id="recurrence-select"
                value={recurrence}
                onChange={(e) => {
                  setRecurrence(e.target.value as Recurrence);
                  setError('');
                }}
                className="w-full pl-10 pr-8 py-3 bg-transparent text-sm text-neutral-11 focus:outline-none appearance-none cursor-pointer"
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {recurrence === 'parcelado' && (
              <div className="flex items-center gap-3 pt-1">
                <div className={`${fieldShell} w-24 flex-shrink-0`}>
                  <input
                    type="number"
                    min={2}
                    max={72}
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 bg-transparent text-sm font-semibold text-neutral-11 tabular-nums focus:outline-none"
                    aria-label="Número de parcelas"
                  />
                </div>
                <p className="text-[11px] text-neutral-10 leading-snug">
                  {installmentParts
                    ? installmentParts[0] === installmentParts[installmentParts.length - 1]
                      ? `${installmentCount}x de ${formatBRL(installmentParts[0])}`
                      : `${installmentCount}x — primeira de ${formatBRL(installmentParts[0])}, demais de ${formatBRL(installmentParts[1])}`
                    : 'Informe o valor total; ele será dividido entre as parcelas.'}
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-08 uppercase tracking-wide">Tags</label>
              {tagIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTagIds([])}
                  className="text-[10px] font-semibold text-neutral-08 hover:text-neutral-11 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>

            {tags.length > 6 && (
              <div className={fieldShell}>
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-08 pointer-events-none">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar tag..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm text-neutral-11 focus:outline-none placeholder-neutral-06"
                />
              </div>
            )}

            {tags.length === 0 ? (
              <p className="text-[11px] text-neutral-08">
                Nenhuma tag criada ainda. Crie em Planejamento para agrupar seus gastos.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {filteredTags.map((tag) => {
                  const Icon = categoryIcon(tag.icon);
                  const active = tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`flex items-center gap-1.5 rounded-full border pl-2 pr-2.5 py-1.5 text-[11px] font-medium transition-all active:scale-95 ${
                        active ? 'text-neutral-11' : 'text-neutral-08 border-neutral-03 hover:border-neutral-05'
                      }`}
                      style={
                        active
                          ? { backgroundColor: `${tag.color}1A`, borderColor: `${tag.color}66` }
                          : undefined
                      }
                    >
                      {active ? <Check size={12} style={{ color: tag.color }} /> : <Icon size={12} />}
                      {tag.name}
                    </button>
                  );
                })}
                {filteredTags.length === 0 && (
                  <p className="text-[11px] text-neutral-08 py-1">Nenhuma tag com esse nome.</p>
                )}
              </div>
            )}
          </div>

          {/* Atalho: registrar o gasto do dia sem lançar item a item. */}
          {effectiveDate && effectiveDate <= todayStr && !editingTransaction && (
            <div className="rounded-2xl border border-neutral-03/70 bg-neutral-01 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="quick-spend" className="text-xs font-semibold text-neutral-10">
                  Gasto do dia (atalho)
                </label>
                <span className="text-[10px] text-neutral-08 tabular-nums">
                  meta {formatBRL(dailyBudget)}/dia
                </span>
              </div>
              <div className={fieldShell}>
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-08 text-xs font-medium pointer-events-none">
                  R$
                </span>
                <input
                  id="quick-spend"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={quickSpendInput}
                  onChange={(e) => handleQuickSpendChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm font-semibold text-neutral-11 tabular-nums focus:outline-none placeholder-neutral-06"
                />
              </div>
              <p className="text-[10px] text-neutral-08 leading-relaxed">
                Salva sozinho num único lançamento diário desta data. Deixe em branco para apagá-lo.
              </p>
            </div>
          )}

          {error && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400" role="alert">
              {error}
            </p>
          )}
        </form>

        {/* Rodapé fixo: o botão principal nunca fica fora de alcance na folha longa. */}
        <div
          className="flex-shrink-0 px-5 tablet:px-6 pt-4 border-t border-neutral-02 bg-neutral-00"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-2xl bg-neutral-11 text-neutral-00 text-sm font-semibold shadow-sm transition-all hover:bg-neutral-10 active:scale-[0.98]"
          >
            {editingTransaction ? 'Salvar alterações' : `Adicionar ${meta.short.toLowerCase()}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
