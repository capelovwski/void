import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Tag as TagIcon, FileText, Briefcase } from 'lucide-react';
import type { Transaction, TransactionType, Tag } from '../types';
import { CATEGORY_ICONS } from './PlanejamentoTab';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  tags: Tag[];
  editingTransaction?: Transaction | null;
  defaultDate?: string;
  dailyBaseSpend: number;
  realSpends: Record<string, number>;
  onUpdateRealSpend: (dateStr: string, value: number) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tags,
  editingTransaction,
  defaultDate,
  dailyBaseSpend,
  realSpends,
  onUpdateRealSpend,
}) => {
  const [type, setType] = useState<TransactionType>('saida');
  const [value, setValue] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [tagId, setTagId] = useState<string>('');
  const [realSpendInput, setRealSpendInput] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setValue(editingTransaction.value.toString());
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
      setTagId(editingTransaction.tagId || '');
    } else {
      setType('saida');
      setValue('');
      setDescription('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTagId('');
    }
  }, [editingTransaction, defaultDate, isOpen]);

  useEffect(() => {
    if (isOpen && date) {
      const val = realSpends[date];
      setRealSpendInput(val !== undefined && val !== null ? val.toString() : '');
    }
  }, [isOpen, date, realSpends]);

  // Esc key down listener for closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { 
      y: isMobile ? "100%" : 20,
      scale: isMobile ? 1 : 0.95,
      opacity: isMobile ? 1 : 0
    },
    visible: { 
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { type: "spring", damping: 25, stiffness: 350 }
    },
    exit: {
      y: isMobile ? "100%" : 20,
      scale: isMobile ? 1 : 0.95,
      opacity: isMobile ? 1 : 0,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  const handleRealSpendChange = (valStr: string) => {
    setRealSpendInput(valStr);
    const cleaned = valStr.trim();
    let val = 0;
    if (cleaned !== '') {
      val = parseFloat(cleaned);
      if (isNaN(val) || val < 0) {
        val = 0;
      }
    }
    onUpdateRealSpend(date, val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || isNaN(Number(value)) || Number(value) <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }
    if (!date) {
      alert('Por favor, selecione uma data.');
      return;
    }

    onSave({
      id: editingTransaction?.id,
      type,
      value: Number(value),
      description: description.trim() || (type === 'fatura' ? 'Fatura Cartão' : type.toUpperCase()),
      date,
      tagId: tagId || undefined,
    });
    onClose();
  };

  const typesConfig: { value: TransactionType; label: string; colorClass: string; activeClass: string }[] = [
    { value: 'entrada', label: 'Entrada', colorClass: 'text-success border-success/20 bg-success/5', activeClass: 'bg-success text-white' },
    { value: 'saida', label: 'Saída (Débito)', colorClass: 'text-red-500 border-red-500/20 bg-red-500/5', activeClass: 'bg-red-500 text-white' },
    { value: 'fatura', label: 'Fatura (Crédito)', colorClass: 'text-amber-600 border-amber-600/20 bg-amber-600/5', activeClass: 'bg-amber-600 text-white' },
    { value: 'economia', label: 'Economia', colorClass: 'text-violet-500 dark:text-violet-400 border-violet-500/20 bg-violet-500/10', activeClass: 'bg-violet-600 text-white' },
  ];

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-end tablet:items-center justify-center p-0 tablet:p-4 bg-overlay-02 cursor-pointer"
      onClick={handleOverlayClick}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
    >
      <motion.div 
        className="relative w-full max-w-lg bg-neutral-00 rounded-t-3xl rounded-b-none tablet:rounded-3xl border-t tablet:border border-neutral-03 shadow-2xl overflow-hidden max-h-[92vh] tablet:max-h-[90vh] flex flex-col cursor-default"
        variants={modalVariants}
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(event, info) => {
          if (info.offset.y > 150) {
            onClose();
          }
        }}
      >
        {/* Handle de arrasto no mobile */}
        <div className="w-12 h-1.5 bg-neutral-03/75 rounded-full mx-auto my-3 block tablet:hidden flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 tablet:p-6 border-b border-neutral-02 bg-neutral-01">
          <h3 className="text-base tablet:text-xl font-semibold font-albert-sans text-neutral-11">
            {editingTransaction ? 'Editar Movimentação' : 'Nova Movimentação'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-02 text-neutral-10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 tablet:p-6 space-y-4 tablet:space-y-6">
          {/* Daily Spend Limit dynamic display */}
          <div className="p-3.5 rounded-2xl border border-neutral-03/70 bg-neutral-01 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-08 font-bold uppercase tracking-wider block">Meta de Gasto</span>
              <span className="text-xs font-semibold text-neutral-10">Limite Diário Disponível</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black font-albert-sans text-neutral-11">
                R$ {dailyBaseSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Gasto Real input for past/current dates */}
          {date && date <= todayStr && (
            <div className="space-y-2">
              <label htmlFor="real-spend-modal" className="text-sm font-semibold text-neutral-10 block">
                Gasto Real do Dia (Opcional)
              </label>
              <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08 font-medium">R$</span>
                <input
                  id="real-spend-modal"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={realSpendInput}
                  onChange={(e) => handleRealSpendChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-transparent text-sm font-semibold text-neutral-11 focus:outline-none placeholder-neutral-06"
                />
              </div>
              <p className="text-[10px] text-neutral-08">
                * Se deixado em branco, o sistema assume gasto de R$ 0,00 para este dia.
              </p>
            </div>
          )}

          {/* Transaction Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-10 block">Tipo de Movimentação</label>
            <div className="grid grid-cols-2 tablet:grid-cols-4 gap-2">
              {typesConfig.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setType(item.value)}
                  className={`py-3 px-2 text-center rounded-xl text-sm border font-medium transition-all ${
                    type === item.value
                      ? item.activeClass + ' border-transparent shadow-sm scale-[1.02]'
                      : 'border-neutral-03 text-neutral-10 hover:bg-neutral-01 hover:text-neutral-11'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            <label htmlFor="value-input" className="text-sm font-semibold text-neutral-10 block">Valor (R$)</label>
            <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08 font-medium">R$</span>
              <input
                id="value-input"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-transparent text-lg font-semibold text-neutral-11 focus:outline-none placeholder-neutral-06"
              />
            </div>
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <label htmlFor="date-input" className="text-sm font-semibold text-neutral-10 block">
              {type === 'fatura' ? 'Vencimento da Fatura' : 'Data do Lançamento'}
            </label>
            <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
                <Calendar size={18} />
              </span>
              <input
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-transparent text-neutral-11 focus:outline-none"
              />
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <label htmlFor="desc-input" className="text-sm font-semibold text-neutral-10 block">Descrição (Opcional)</label>
            <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
                <FileText size={18} />
              </span>
              <input
                id="desc-input"
                type="text"
                placeholder={type === 'fatura' ? 'Ex: Fatura Nubank' : 'Ex: Supermercado, Salário...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-transparent text-neutral-11 focus:outline-none placeholder-neutral-06"
              />
            </div>
          </div>

          {/* Tag Selection */}
          <div className="space-y-2">
            <label htmlFor="tag-input" className="text-sm font-semibold text-neutral-10 block">Categoria / Tag (Opcional)</label>
            <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-08">
                <TagIcon size={18} />
              </span>
              <select
                id="tag-input"
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-transparent text-neutral-11 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">Nenhuma Categoria</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-08 font-bold">
                ▼
              </div>
            </div>
            {tagId && (() => {
              const selectedTag = tags.find(t => t.id === tagId);
              if (!selectedTag) return null;
              const IconComponent = CATEGORY_ICONS[selectedTag.icon as keyof typeof CATEGORY_ICONS] || Briefcase;
              return (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-neutral-08">Categoria:</span>
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center border text-[10px]"
                    style={{ 
                      backgroundColor: `${selectedTag.color}15`, 
                      borderColor: `${selectedTag.color}30`,
                      color: selectedTag.color 
                    }}
                  >
                    <IconComponent size={12} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-11">
                    {selectedTag.name}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Footer inside Form */}
          <div className="pt-4 border-t border-neutral-02">
            <button
              type="submit"
              className="w-full py-3 bg-neutral-11 text-neutral-00 hover:bg-neutral-10 text-center font-semibold rounded-xl shadow-sm transition-all active:scale-95 text-sm"
            >
              Lançar Movimentação
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
