import React, { useState } from 'react';
import { CreditCard, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Card } from '../../types';
import { invoiceDueDate, normalizeCard, todayYMD } from '../../core';

interface CardsSectionProps {
  cards: Card[];
  onSaveCard: (card: Omit<Card, 'id'> & { id?: string }) => void;
  onDeleteCard: (cardId: string) => void;
}

const CARD_COLORS = ['#8A05BE', '#EC7000', '#00A868', '#1A1A1A', '#005CA9', '#E31C79'];

const emptyDraft = { id: undefined as string | undefined, name: '', closingDay: '28', dueDay: '5', color: CARD_COLORS[0] };

const field =
  'w-full px-3 py-2.5 rounded-xl border border-neutral-03 bg-neutral-01 text-sm text-neutral-11 focus:outline-none focus:border-neutral-11 transition-colors';

/**
 * Cadastro dos cartões. É essa configuração que permite ao app jogar uma compra
 * no crédito para a data certa: o dia de fechamento define em qual fatura ela
 * cai, e o de vencimento define quando o valor sai do saldo.
 */
export const CardsSection: React.FC<CardsSectionProps> = ({ cards, onSaveCard, onDeleteCard }) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState('');
  const isEditing = draft.id !== undefined;

  const closingDay = Number(draft.closingDay);
  const dueDay = Number(draft.dueDay);
  const daysAreValid =
    Number.isFinite(closingDay) && closingDay >= 1 && closingDay <= 31 &&
    Number.isFinite(dueDay) && dueDay >= 1 && dueDay <= 31;

  // Exemplo com a data de hoje: mostra na prática o que a configuração faz.
  const todayStr = todayYMD();
  const preview = daysAreValid ? invoiceDueDate(todayStr, { closingDay, dueDay }) : null;

  const resetDraft = () => {
    setDraft(emptyDraft);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!draft.name.trim()) {
      setError('Dê um nome ao cartão.');
      return;
    }
    if (!daysAreValid) {
      setError('Fechamento e vencimento precisam ser dias entre 1 e 31.');
      return;
    }

    const normalized = normalizeCard({
      id: draft.id ?? '',
      name: draft.name.trim(),
      closingDay,
      dueDay,
      color: draft.color,
    });

    onSaveCard(draft.id ? normalized : { name: normalized.name, closingDay: normalized.closingDay, dueDay: normalized.dueDay, color: normalized.color });
    resetDraft();
  };

  const startEdit = (card: Card) => {
    setDraft({
      id: card.id,
      name: card.name,
      closingDay: String(card.closingDay),
      dueDay: String(card.dueDay),
      color: card.color ?? CARD_COLORS[0],
    });
    setError('');
  };

  return (
    <div className="card-premium p-6 space-y-5">
      <div className="flex items-center gap-2 text-neutral-11 border-b border-neutral-02 pb-3">
        <CreditCard size={18} className="text-neutral-08" />
        <h3 className="text-base font-bold font-albert-sans">Cartões de crédito</h3>
      </div>

      {cards.length === 0 ? (
        <p className="text-[11px] text-neutral-08 leading-relaxed">
          Sem cartões cadastrados. Cadastre um para o app calcular sozinho em qual fatura cada compra
          cai e descontar o valor só no vencimento.
        </p>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-neutral-02 bg-neutral-01/40"
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                style={{ backgroundColor: card.color ?? CARD_COLORS[0] }}
              >
                <CreditCard size={15} />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-11 truncate">{card.name}</p>
                <p className="text-[10px] text-neutral-08 tabular-nums">
                  fecha dia {card.closingDay} · vence dia {card.dueDay}
                </p>
              </div>

              <button
                type="button"
                onClick={() => startEdit(card)}
                className="p-1.5 rounded-lg text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 transition-colors"
                title={`Editar ${card.name}`}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Excluir o cartão "${card.name}"? As compras lançadas continuam, mantendo o vencimento já calculado.`)) {
                    onDeleteCard(card.id);
                  }
                }}
                className="p-1.5 rounded-lg text-neutral-08 hover:text-rose-500 transition-colors"
                title={`Excluir ${card.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 pt-1 border-t border-neutral-02">
        <div className="flex items-center justify-between pt-3">
          <span className="text-xs font-bold text-neutral-10 uppercase tracking-wide">
            {isEditing ? 'Editar cartão' : 'Novo cartão'}
          </span>
          {isEditing && (
            <button
              type="button"
              onClick={resetDraft}
              className="flex items-center gap-1 text-[10px] font-semibold text-neutral-08 hover:text-neutral-11 transition-colors"
            >
              <X size={11} />
              Cancelar
            </button>
          )}
        </div>

        <input
          type="text"
          maxLength={24}
          placeholder="Nome do cartão (ex: Nubank)"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={field}
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1.5">
            <span className="text-[10px] font-semibold text-neutral-08 uppercase tracking-wide block">Fecha dia</span>
            <input
              type="number"
              min={1}
              max={31}
              value={draft.closingDay}
              onChange={(e) => setDraft({ ...draft, closingDay: e.target.value })}
              className={`${field} tabular-nums`}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-semibold text-neutral-08 uppercase tracking-wide block">Vence dia</span>
            <input
              type="number"
              min={1}
              max={31}
              value={draft.dueDay}
              onChange={(e) => setDraft({ ...draft, dueDay: e.target.value })}
              className={`${field} tabular-nums`}
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          {CARD_COLORS.map((color) => (
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
        </div>

        {preview && (
          <p className="text-[10px] text-neutral-08 leading-relaxed">
            Uma compra feita hoje cairia na fatura que vence em{' '}
            <strong className="text-neutral-11">
              {new Date(`${preview}T12:00:00`).toLocaleDateString('pt-BR')}
            </strong>
            .
          </p>
        )}

        {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}

        <button type="submit" className="btn-filled w-full py-2.5 text-xs rounded-xl">
          <Plus size={14} />
          {isEditing ? 'Salvar cartão' : 'Adicionar cartão'}
        </button>
      </form>
    </div>
  );
};
