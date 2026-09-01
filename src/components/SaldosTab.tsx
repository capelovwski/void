import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react';
import type { Transaction, Tag } from '../types';
import { isOutflow } from '../config/transactionTypes';
import { useIsMobile } from '../hooks/useBreakpoint';
import { todayYMD } from '../core';

interface SaldosTabProps {
  transactions: Transaction[];
  tags: Tag[];
  onAddTransactionClick: (date?: string) => void;
  dailyBalances: Record<string, number>;
  theme: 'dark' | 'light';
  dailyBudget: number;
  onGoToPlanning: () => void;
}

/** 0 = mês atual. O app só projeta a partir de hoje, então não dá para voltar antes disso. */
const MAX_MONTH_OFFSET = 2;

const formatCompactBalance = (val: number): string => {
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  let formatted = '';
  if (absVal >= 1000) {
    const kVal = absVal / 1000;
    if (kVal >= 10) {
      formatted = `${Math.round(kVal)}k`;
    } else {
      const rounded = Math.round(kVal * 10) / 10;
      formatted = `${rounded.toLocaleString('pt-BR')}k`;
    }
  } else {
    formatted = Math.round(absVal).toString();
  }
  return `${isNeg ? '-' : ''}R$${formatted}`;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const heatmapClassFor = (dayBalance: number): string => {
  if (dayBalance >= 5000) return 'bg-heatmap-high-bg text-heatmap-high-text border-heatmap-high-border';
  if (dayBalance >= 300) return 'bg-heatmap-ok-bg text-heatmap-ok-text border-heatmap-ok-border';
  if (dayBalance >= 100) return 'bg-heatmap-warn-bg text-heatmap-warn-text border-heatmap-warn-border';
  if (dayBalance >= 0) return 'bg-heatmap-crit-bg text-heatmap-crit-text border-heatmap-crit-border';
  return 'bg-heatmap-neg-bg text-heatmap-neg-text border-heatmap-neg-border';
};

export const SaldosTab: React.FC<SaldosTabProps> = ({
  transactions,
  tags,
  onAddTransactionClick,
  dailyBalances,
  theme,
  dailyBudget,
  onGoToPlanning,
}) => {
  const todayStr = todayYMD();
  const isMobile = useIsMobile();
  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const monthLabel = `${capitalize(monthDate.toLocaleDateString('pt-BR', { month: 'long' }))} ${year}`;

  const formatDateToYMD = (y: number, m: number, day: number): string => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getMonthDays = (y: number, m: number) => {
    const firstDay = new Date(y, m, 1);
    const totalDays = new Date(y, m + 1, 0).getDate();
    return { totalDays, startDayOfWeek: firstDay.getDay() };
  };

  // A bolinha ao lado do lançamento usa a primeira tag dele.
  const getPrimaryTag = (t: Transaction) => {
    const first = t.tagIds?.[0] ?? t.tagId;
    return first ? tags.find((tag) => tag.id === first) : undefined;
  };

  return (
    <div className="space-y-6 pb-24 mx-auto w-full max-w-5xl desktop:min-h-[calc(100vh-140px)] desktop:flex desktop:flex-col desktop:justify-center">

      {/* Header: título + paginador de mês (mês atual e os 2 seguintes) */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold font-albert-sans text-neutral-11 flex items-center gap-2">
          <CalendarIcon size={18} className="text-neutral-08" />
          Horizonte de Eventos
        </h2>

        <div className="flex items-center gap-1 bg-neutral-01 p-1 rounded-xl border border-neutral-03/80">
          <button
            onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
            disabled={monthOffset === 0}
            className="p-1.5 rounded-lg text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-08 transition-all"
            title="Mês anterior"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-xs font-bold text-neutral-11 min-w-[104px] text-center tabular-nums">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthOffset((m) => Math.min(MAX_MONTH_OFFSET, m + 1))}
            disabled={monthOffset === MAX_MONTH_OFFSET}
            className="p-1.5 rounded-lg text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-08 transition-all"
            title="Próximo mês"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Sem receita fixa cadastrada o gasto diário base é zero, e a projeção
          fica "parada" nos dias futuros — o que parece um bug. Avisa e leva
          direto para onde se configura. */}
      {dailyBudget === 0 && (
        <button
          onClick={onGoToPlanning}
          className="w-full flex items-start gap-2 p-3 rounded-xl bg-main/10 border border-main/25 text-left transition-colors hover:bg-main/15"
        >
          <CircleAlert size={14} className="text-main flex-shrink-0 mt-0.5" />
          <span className="text-[11px] text-neutral-10 leading-relaxed">
            <strong className="text-neutral-11">Gasto diário zerado.</strong> Cadastre suas
            categorias em <strong className="text-neutral-11">Previsão de diário</strong>, dentro de
            Planejamento, para o saldo projetar os dias futuros.
          </span>
        </button>
      )}

      {isMobile ? (
        // Mobile: lista vertical dos dias do mês selecionado.
        <div className="card-premium p-4 flex flex-col space-y-2 h-auto">
          {(() => {
            const { totalDays } = getMonthDays(year, monthIndex);
            const days = [];

            for (let day = 1; day <= totalDays; day++) {
              const dateStr = formatDateToYMD(year, monthIndex, day);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const dayBalance = dailyBalances[dateStr] ?? 0;
              const dayTransactions = transactions.filter((t) => t.date === dateStr);
              const dayTransactionsCount = dayTransactions.length;

              const dateObj = new Date(dateStr + 'T00:00:00');
              const weekdayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

              const temporalOpacity = isPast ? 'opacity-35 grayscale contrast-75 brightness-[0.8] hover:opacity-85 hover:grayscale-0 hover:contrast-100 hover:brightness-100 transition-all' : 'opacity-100';
              const presentBorder = isToday
                ? (theme === 'dark'
                  ? 'ring-2 ring-main border-main bg-main/15 shadow-[0_0_12px_rgba(254,247,175,0.25)] scale-[1.01] z-10 font-bold'
                  : 'ring-2 ring-neutral-11 border-neutral-11 bg-neutral-02 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.01] z-10 font-bold')
                : 'border-neutral-02/60 bg-neutral-00/30';

              days.push(
                <button
                  key={dateStr}
                  onClick={() => onAddTransactionClick(dateStr)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:border-neutral-05 ${temporalOpacity} ${presentBorder}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex flex-col items-center justify-center border rounded-xl w-10 h-10 flex-shrink-0 ${
                      isToday
                        ? (theme === 'dark' ? 'bg-main text-zinc-950 border-main font-black' : 'bg-neutral-12 text-neutral-00 border-neutral-12 font-black')
                        : 'bg-neutral-01 border-neutral-03/80'
                    }`}>
                      <span className="text-xs font-black">{day}</span>
                      <span className="text-[9px] uppercase font-bold">{weekdayName}</span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1 pr-2">
                      {dayTransactions.slice(0, 2).map((t) => {
                        const tag = getPrimaryTag(t);
                        const isExpense = isOutflow(t.type);
                        return (
                          <div key={t.id} className="flex items-center gap-1.5 text-[10px] text-neutral-10 truncate font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag?.color || (isExpense ? '#EF4444' : '#10B981') }} />
                            <span className="truncate max-w-[80px]">{t.description}</span>
                            <span className={`ml-auto font-mono text-[9px] ${isExpense ? 'text-red-500' : 'text-success'}`}>
                              {isExpense ? '-' : '+'}R${Math.round(t.value)}
                            </span>
                          </div>
                        );
                      })}
                      {dayTransactionsCount > 2 && (
                        <span className="text-[9px] text-neutral-08 font-bold">
                          +{dayTransactionsCount - 2} transações
                        </span>
                      )}
                      {dayTransactionsCount === 0 && (
                        <span className="text-[10px] text-neutral-07 italic">Sem eventos</span>
                      )}
                    </div>
                  </div>

                  <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold font-albert-sans shadow-sm ${heatmapClassFor(dayBalance)} flex-shrink-0`}>
                    {formatCompactBalance(dayBalance)}
                  </div>
                </button>,
              );
            }

            return days;
          })()}
        </div>
      ) : (
        // Desktop: grade tradicional de calendário do mês selecionado.
        <div className="card-premium p-4 flex flex-col h-auto desktop:h-[72vh]">
          {(() => {
            const { totalDays, startDayOfWeek } = getMonthDays(year, monthIndex);
            const weekHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const dayBlocks = [];

            for (let i = 0; i < startDayOfWeek; i++) {
              dayBlocks.push(<div key={`empty-${i}`} className="aspect-square tablet:aspect-auto tablet:h-full tablet:min-h-24 border border-transparent" />);
            }

            for (let day = 1; day <= totalDays; day++) {
              const dateStr = formatDateToYMD(year, monthIndex, day);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const dayBalance = dailyBalances[dateStr] ?? 0;

              const dayTransactions = transactions.filter((t) => t.date === dateStr);
              const dayTransactionsCount = dayTransactions.length;

              const temporalOpacity = isPast ? 'opacity-35 grayscale contrast-75 brightness-[0.8] hover:opacity-85 hover:grayscale-0 hover:contrast-100 hover:brightness-100 transition-all' : 'opacity-100';
              const presentBorder = isToday
                ? (theme === 'dark'
                  ? 'ring-2 ring-main border-main bg-main/20 shadow-[0_0_15px_rgba(254,247,175,0.3)] scale-[1.03] z-10 font-bold'
                  : 'ring-2 ring-neutral-11 border-neutral-11 bg-neutral-02 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.03] z-10 font-bold')
                : 'border';

              dayBlocks.push(
                <button
                  key={`day-${day}`}
                  onClick={() => onAddTransactionClick(dateStr)}
                  className={`rounded-xl flex flex-col text-left transition-all aspect-square tablet:aspect-auto tablet:h-full tablet:min-h-24 p-1 tablet:p-2 items-center tablet:items-stretch justify-center tablet:justify-between gap-0.5 tablet:gap-0 ${heatmapClassFor(dayBalance)} ${presentBorder} ${temporalOpacity}`}
                >
                  <div className="flex items-center justify-center tablet:justify-between w-full">
                    <span className={`text-[11px] tablet:text-xs font-black ${
                      isToday
                        ? (theme === 'dark'
                            ? 'bg-main text-zinc-950 w-5 h-5 tablet:w-5.5 tablet:h-5.5 rounded-full flex items-center justify-center shadow-sm'
                            : 'bg-neutral-12 text-neutral-00 w-5 h-5 tablet:w-5.5 tablet:h-5.5 rounded-full flex items-center justify-center shadow-sm')
                        : ''
                    }`}>
                      {day}
                    </span>
                  </div>

                  {/* Mobile: indicador discreto de que o dia tem lançamentos.
                      A lista detalhada não cabe numa célula de ~40px, então
                      fica só a partir do tablet (o toque abre o lançamento). */}
                  {dayTransactionsCount > 0 && (
                    <span className="tablet:hidden w-1 h-1 rounded-full bg-current opacity-60 flex-shrink-0" />
                  )}

                  <div className="hidden tablet:flex w-full my-1.5 flex-col gap-0.5 overflow-hidden">
                    {dayTransactions.slice(0, 2).map((t, idx) => {
                      const isExpense = isOutflow(t.type);
                      return (
                        <div
                          key={t.id || idx}
                          className="text-[9.5px] font-semibold text-neutral-11 flex items-center justify-between gap-1 w-full truncate"
                          title={t.description}
                        >
                          <span className="truncate max-w-[45px] text-[8px] text-neutral-08 font-normal">{t.description}</span>
                          <div className="flex items-center gap-0.5">
                            <span className={isExpense ? 'text-rose-500 font-bold' : 'text-success font-bold'}>
                              {isExpense ? '-' : '+'}R${Math.round(t.value)}
                            </span>
                            {isExpense && (
                              <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {dayTransactionsCount > 2 && (
                      <div className="text-[8px] text-neutral-08 text-right font-bold">
                        +{dayTransactionsCount - 2} mais
                      </div>
                    )}
                  </div>

                  <div className="w-full text-center tablet:text-right overflow-hidden tablet:border-t tablet:border-neutral-02/30 tablet:pt-1 tablet:mt-1">
                    <span className="tablet:hidden font-black font-albert-sans block text-[9px] leading-none text-neutral-11">
                      {formatCompactBalance(dayBalance)}
                    </span>
                    <span className="hidden tablet:block font-black font-albert-sans truncate text-xs tablet:text-sm text-neutral-11">
                      R$ {Math.round(dayBalance).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </button>,
              );
            }

            return (
              <>
                <div className="grid grid-cols-7 gap-1 tablet:gap-1.5 text-center text-[9px] tablet:text-[10px] font-semibold text-neutral-08 uppercase mb-1.5">
                  {weekHeaders.map((h) => (
                    <div key={h}>{h}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 tablet:gap-1.5 tablet:flex-1">
                  {dayBlocks}
                </div>
              </>
            );
          })()}
        </div>
      )}

    </div>
  );
};
