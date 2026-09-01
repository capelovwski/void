import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react';
import type { Transaction, Tag } from '../types';
import { isOutflow } from '../config/transactionTypes';
import { useIsMobile } from '../hooks/useBreakpoint';
import { formatCompactBRL, todayYMD } from '../core';

interface SaldosTabProps {
  transactions: Transaction[];
  tags: Tag[];
  onAddTransactionClick: (date?: string) => void;
  dailyBalances: Record<string, number>;
  theme: 'dark' | 'light';
  dailyBudget: number;
  onStartSetup: () => void;
}

/** 0 = mês atual. O app só projeta a partir de hoje, então não dá para voltar antes disso. */
const MAX_MONTH_OFFSET = 2;

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
  onStartSetup,
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
    <div className="pb-24 mx-auto w-full max-w-5xl desktop:min-h-[calc(100vh-140px)] desktop:flex desktop:flex-col desktop:justify-center">

      {/* Header com o seletor de mês.
          No mobile ele gruda no topo da área rolável: a lista tem 30 dias e,
          sem isso, trocar de mês exigiria rolar tudo de volta. Sangra até as
          bordas para o fundo desfocado cobrir a largura inteira. */}
      <div className="sticky -top-6 z-20 -mx-4 -mt-6 mb-4 flex items-center justify-between gap-3 border-b border-neutral-02/60 bg-bg-01/85 px-4 pb-3 pt-6 backdrop-blur-xl tablet:static tablet:mx-0 tablet:mb-6 tablet:mt-0 tablet:border-0 tablet:bg-transparent tablet:px-0 tablet:pb-0 tablet:pt-0 tablet:backdrop-blur-none">
        <h2 className="flex min-w-0 items-center gap-2 font-albert-sans text-base font-bold text-neutral-11">
          <CalendarIcon size={18} className="flex-shrink-0 text-neutral-08" />
          Calendário
        </h2>

        <div className="flex flex-shrink-0 items-center gap-1 rounded-xl border border-neutral-03/80 bg-neutral-01 p-1">
          <button
            onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
            disabled={monthOffset === 0}
            className="rounded-lg p-1.5 text-neutral-08 transition-all hover:bg-neutral-02 hover:text-neutral-11 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-08"
            title="Mês anterior"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="whitespace-nowrap px-2 text-center text-xs font-bold tabular-nums text-neutral-11 tablet:min-w-[104px]">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthOffset((m) => Math.min(MAX_MONTH_OFFSET, m + 1))}
            disabled={monthOffset === MAX_MONTH_OFFSET}
            className="rounded-lg p-1.5 text-neutral-08 transition-all hover:bg-neutral-02 hover:text-neutral-11 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-08"
            title="Próximo mês"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Sem gasto diário o saldo não se move nos dias futuros e a tela vira uma
          coluna de valores repetidos. O aviso antigo explicava onde clicar —
          "Previsão de diário, dentro de Planejamento" — e mandava o usuário
          caçar duas telas. Agora ele resolve no próprio lugar. */}
      {dailyBudget === 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-main/25 bg-main/10 p-4 tablet:mb-6 tablet:flex-row tablet:items-center tablet:justify-between">
          <div className="flex items-start gap-2.5">
            <CircleAlert size={16} className="mt-0.5 flex-shrink-0 text-main" />
            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-neutral-11">
                Falta dizer quanto você gasta por dia
              </p>
              <p className="text-[12px] leading-relaxed text-neutral-08">
                Sem isso o app não consegue prever como seu saldo fica nos próximos meses.
              </p>
            </div>
          </div>

          <button
            onClick={onStartSetup}
            className="flex-shrink-0 rounded-xl bg-main px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-all hover:brightness-95 active:scale-[0.98]"
          >
            Configurar agora
          </button>
        </div>
      )}

      {isMobile ? (
        /* Mobile: lista corrida sangrando até as bordas.
           Trinta cartões empilhados criavam trinta molduras concorrendo pela
           atenção; aqui a separação é só um filete, e o peso visual sobra para
           o que importa em cada linha — o dia e o saldo projetado. */
        <div className="-mx-4 divide-y divide-neutral-02/50 border-y border-neutral-02/50">
          {(() => {
            const { totalDays } = getMonthDays(year, monthIndex);
            const days = [];

            for (let day = 1; day <= totalDays; day++) {
              const dateStr = formatDateToYMD(year, monthIndex, day);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const dayBalance = dailyBalances[dateStr] ?? 0;
              const dayTransactions = transactions.filter((t) => t.date === dateStr);
              const extras = dayTransactions.length - 2;

              const dateObj = new Date(dateStr + 'T00:00:00');
              const weekdayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

              days.push(
                <button
                  key={dateStr}
                  onClick={() => onAddTransactionClick(dateStr)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-neutral-01 ${
                    isToday ? 'bg-main/[0.07]' : ''
                  } ${isPast ? 'opacity-45' : ''}`}
                >
                  {/* Data: número em destaque, dia da semana como apoio. */}
                  <div
                    className={`w-9 flex-shrink-0 text-center ${
                      isToday ? 'text-main' : 'text-neutral-11'
                    }`}
                  >
                    <div className="text-[15px] font-semibold leading-none tabular-nums">{day}</div>
                    <div
                      className={`mt-1 text-[10px] uppercase leading-none tracking-wider ${
                        isToday ? 'text-main/80' : 'text-neutral-08'
                      }`}
                    >
                      {weekdayName}
                    </div>
                  </div>

                  {/* Lançamentos do dia. */}
                  <div className="min-w-0 flex-1 space-y-1">
                    {dayTransactions.slice(0, 2).map((t) => {
                      const tag = getPrimaryTag(t);
                      const isExpense = isOutflow(t.type);
                      return (
                        <div key={t.id} className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: tag?.color || (isExpense ? '#F43F5E' : '#10B981') }}
                          />
                          <span className="truncate text-[13px] text-neutral-10">{t.description}</span>
                          <span
                            className={`ml-auto flex-shrink-0 text-[12px] tabular-nums ${
                              isExpense ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
                            }`}
                          >
                            {isExpense ? '−' : '+'}
                            {formatCompactBRL(t.value).replace('R$ ', '')}
                          </span>
                        </div>
                      );
                    })}

                    {extras > 0 && (
                      <span className="block text-[11px] text-neutral-08">
                        +{extras} {extras === 1 ? 'lançamento' : 'lançamentos'}
                      </span>
                    )}

                    {dayTransactions.length === 0 && (
                      <span className="block text-[13px] text-neutral-07">Sem eventos</span>
                    )}
                  </div>

                  {/* Saldo projetado: o dado principal da linha. */}
                  <span
                    className={`flex-shrink-0 rounded-lg border px-2 py-1 text-[12px] font-semibold tabular-nums ${heatmapClassFor(dayBalance)}`}
                  >
                    {formatCompactBRL(dayBalance)}
                  </span>
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
                      {formatCompactBRL(dayBalance)}
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
