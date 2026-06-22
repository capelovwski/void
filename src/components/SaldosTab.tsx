import React, { useState } from 'react';
import { Plus, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, CreditCard, PiggyBank, X, Briefcase } from 'lucide-react';
import type { Transaction, Tag } from '../types';
import { CATEGORY_ICONS } from './PlanejamentoTab';

interface SaldosTabProps {
  transactions: Transaction[];
  tags: Tag[];
  initialBalance: number;
  setInitialBalance: (balance: number) => void;
  onAddTransactionClick: (date?: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  dailyBalances: Record<string, number>;
  realSpends: Record<string, number>;
  onUpdateRealSpend: (dateStr: string, value: number) => void;
  dailyBaseSpend: number;
  theme: 'dark' | 'light';
}

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

export const SaldosTab: React.FC<SaldosTabProps> = ({
  transactions,
  tags,
  onAddTransactionClick,
  onEditTransaction,
  dailyBalances,
  realSpends,
  onUpdateRealSpend,
  dailyBaseSpend,
  theme,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [calendarView, setCalendarView] = useState<'1month' | '3months'>('1month');

  // Helper to format date strings
  const formatDateToYMD = (year: number, monthIndex: number, day: number): string => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  // Generate months to display
  const getMonthsToRender = () => {
    const months = [];
    const today = new Date();
    const count = calendarView === '1month' ? 1 : 3;
    
    for (let i = 0; i < count; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        name: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      });
    }
    return months;
  };

  const monthsToRender = getMonthsToRender();

  const getMonthDays = (year: number, monthIndex: number) => {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const totalDays = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday...
    return { totalDays, startDayOfWeek };
  };

  // Selected date transactions
  const selectedDateTransactions = transactions.filter((t) => t.date === selectedDateStr);

  const getTagDetails = (tagId?: string) => {
    return tags.find((t) => t.id === tagId);
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto w-full desktop:min-h-[calc(100vh-140px)] desktop:flex desktop:flex-col desktop:justify-center">
      
      {/* despoluído calendar header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold font-albert-sans text-neutral-11 flex items-center gap-2">
          <CalendarIcon size={18} className="text-neutral-08" />
          Horizonte de Eventos
        </h2>

        {/* Small minimalist details corner toggle buttons */}
        <div className="flex bg-neutral-01 p-1 rounded-xl border border-neutral-03/80">
          <button
            onClick={() => setCalendarView('1month')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
              calendarView === '1month'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11'
            }`}
            title="Ver 1 mês"
          >
            1 Mês
          </button>
          <button
            onClick={() => setCalendarView('3months')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
              calendarView === '3months'
                ? 'bg-neutral-12 text-neutral-00 shadow-sm'
                : 'text-neutral-08 hover:text-neutral-11'
            }`}
            title="Ver 3 meses"
          >
            3 Meses
          </button>
        </div>
      </div>

      {/* Calendar Grid Container / Timeline Container */}
      {calendarView === '3months' ? (
        // Visão de Linha do Tempo em 3 Colunas (Lista Vertical por Mês)
        <div className="grid grid-cols-1 desktop:grid-cols-3 gap-6">
          {monthsToRender.map(({ year, monthIndex, name }) => {
            const { totalDays } = getMonthDays(year, monthIndex);
            const daysList = [];

            for (let day = 1; day <= totalDays; day++) {
              const dateStr = formatDateToYMD(year, monthIndex, day);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const dayBalance = dailyBalances[dateStr] ?? 0;

              // Get transactions for this day
              const dayTransactions = transactions.filter((t) => t.date === dateStr);
              const dayTransactionsCount = dayTransactions.length;

              // Heatmap color class (Progressive Health Scale)
              let heatmapClass = 'bg-neutral-01 text-neutral-11 border-neutral-03 hover:bg-neutral-02';
              if (dayBalance >= 5000) {
                heatmapClass = 'bg-heatmap-high-bg text-heatmap-high-text border-heatmap-high-border';
              } else if (dayBalance >= 300) {
                heatmapClass = 'bg-heatmap-ok-bg text-heatmap-ok-text border-heatmap-ok-border';
              } else if (dayBalance >= 100) {
                heatmapClass = 'bg-heatmap-warn-bg text-heatmap-warn-text border-heatmap-warn-border';
              } else if (dayBalance >= 0) {
                heatmapClass = 'bg-heatmap-crit-bg text-heatmap-crit-text border-heatmap-crit-border';
              } else {
                heatmapClass = 'bg-heatmap-neg-bg text-heatmap-neg-text border-heatmap-neg-border';
              }

              const dateObj = new Date(dateStr + 'T00:00:00');
              const weekdayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

              // Temporal styles: opacidade reduzida se passado, contorno sutil se hoje
              const temporalOpacity = isPast ? 'opacity-35 grayscale contrast-75 brightness-[0.8] hover:opacity-85 hover:grayscale-0 hover:contrast-100 hover:brightness-100 transition-all' : 'opacity-100';
              const presentBorder = isToday
                ? (theme === 'dark'
                  ? 'ring-2 ring-main border-main bg-main/15 shadow-[0_0_12px_rgba(254,247,175,0.25)] scale-[1.01] z-10 font-bold'
                  : 'ring-2 ring-neutral-11 border-neutral-11 bg-neutral-02 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.01] z-10 font-bold')
                : 'border-neutral-02/60 bg-neutral-00/30';

              daysList.push(
                <button
                  key={`timeline-day-${day}`}
                  onClick={() => {
                    onAddTransactionClick(dateStr);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:border-neutral-05 ${temporalOpacity} ${presentBorder}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center border rounded-xl w-10 h-10 flex-shrink-0 ${
                      isToday 
                        ? (theme === 'dark' ? 'bg-main text-zinc-950 border-main font-black' : 'bg-neutral-12 text-neutral-00 border-neutral-12 font-black') 
                        : 'bg-neutral-01 border-neutral-03/80'
                    }`}>
                      <span className={`text-xs font-black ${
                        isToday 
                          ? (theme === 'dark' ? 'text-zinc-950' : 'text-neutral-00') 
                          : 'text-neutral-11'
                      }`}>{day}</span>
                      <span className={`text-[9px] uppercase font-bold ${
                        isToday 
                          ? (theme === 'dark' ? 'text-zinc-800' : 'text-neutral-03') 
                          : 'text-neutral-08'
                      }`}>{weekdayName}</span>
                    </div>

                    {/* Transaction dot indicators */}
                    <div className="flex items-center gap-1.5">
                      {dayTransactions.slice(0, 3).map((t, idx) => {
                        const tag = getTagDetails(t.tagId);
                        const dotColor = tag?.color || (t.type === 'entrada' ? '#10B981' : t.type === 'economia' ? '#8B5CF6' : '#EF4444');
                        return (
                          <span
                            key={t.id + '-' + idx}
                            className="w-1.5 h-1.5 rounded-full border border-black/10 flex-shrink-0"
                            style={{ backgroundColor: dotColor }}
                            title={t.description}
                          />
                        );
                      })}
                      {dayTransactionsCount > 3 && (
                        <span className="text-[8px] text-neutral-08 font-bold pl-0.5">
                          +{dayTransactionsCount - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Balance Badge */}
                  <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold font-albert-sans shadow-sm ${heatmapClass}`}>
                    {formatCompactBalance(dayBalance)}
                  </div>
                </button>
              );
            }

            return (
              <div key={name} className="card-premium p-4 flex flex-col space-y-4 h-[72vh] max-h-[72vh]">
                <h3 className="text-base font-bold font-albert-sans text-neutral-11 capitalize text-center border-b border-neutral-02 pb-2">
                  {name}
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scroll-fade-mask">
                  {daysList}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Visão de 1 Mês (Grade Tradicional de Calendário)
        <div className="grid grid-cols-1 gap-6">
          {monthsToRender.map(({ year, monthIndex, name }) => {
            const { totalDays, startDayOfWeek } = getMonthDays(year, monthIndex);
            const dayBlocks = [];
            const weekHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

            // Padding blocks
            for (let i = 0; i < startDayOfWeek; i++) {
              dayBlocks.push(<div key={`empty-${i}`} className="h-full min-h-16 border border-transparent" />);
            }

            // Render Days
            for (let day = 1; day <= totalDays; day++) {
              const dateStr = formatDateToYMD(year, monthIndex, day);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const dayBalance = dailyBalances[dateStr] ?? 0;

              // Day block specific transactions count
              const dayTransactionsCount = transactions.filter((t) => t.date === dateStr).length;

              // Heatmap color class (Progressive Health Scale)
              let heatmapClass = 'bg-neutral-01 text-neutral-11 border-neutral-03 hover:bg-neutral-02';
              if (dayBalance >= 5000) {
                heatmapClass = 'bg-heatmap-high-bg text-heatmap-high-text border-heatmap-high-border';
              } else if (dayBalance >= 300) {
                heatmapClass = 'bg-heatmap-ok-bg text-heatmap-ok-text border-heatmap-ok-border';
              } else if (dayBalance >= 100) {
                heatmapClass = 'bg-heatmap-warn-bg text-heatmap-warn-text border-heatmap-warn-border';
              } else if (dayBalance >= 0) {
                heatmapClass = 'bg-heatmap-crit-bg text-heatmap-crit-text border-heatmap-crit-border';
              } else {
                heatmapClass = 'bg-heatmap-neg-bg text-heatmap-neg-text border-heatmap-neg-border';
              }

              // Temporal styles: opacidade reduzida se passado, contorno sutil se hoje
              const temporalOpacity = isPast ? 'opacity-35 grayscale contrast-75 brightness-[0.8] hover:opacity-85 hover:grayscale-0 hover:contrast-100 hover:brightness-100 transition-all' : 'opacity-100';
              const presentBorder = isToday
                ? (theme === 'dark'
                  ? 'ring-2 ring-main border-main bg-main/20 shadow-[0_0_15px_rgba(254,247,175,0.3)] scale-[1.03] z-10 font-bold'
                  : 'ring-2 ring-neutral-11 border-neutral-11 bg-neutral-02 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.03] z-10 font-bold')
                : 'border';

              dayBlocks.push(
                <button
                  key={`day-${day}`}
                  onClick={() => {
                    onAddTransactionClick(dateStr);
                  }}
                  className={`rounded-xl flex flex-col justify-between text-left transition-all h-full min-h-16 p-2 ${heatmapClass} ${presentBorder} ${temporalOpacity}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black ${
                      isToday 
                        ? (theme === 'dark' 
                            ? 'bg-main text-zinc-950 w-5.5 h-5.5 rounded-full flex items-center justify-center shadow-sm' 
                            : 'bg-neutral-12 text-neutral-00 w-5.5 h-5.5 rounded-full flex items-center justify-center shadow-sm') 
                        : ''
                    }`}>
                      {day}
                    </span>
                    
                    {/* Small badge for transactions count */}
                    {dayTransactionsCount > 0 && (
                      <span className="text-[9px] bg-neutral-00/55 px-1.5 py-0.5 rounded-full font-bold">
                        {dayTransactionsCount} {dayTransactionsCount === 1 ? 'lanç.' : 'lançs.'}
                      </span>
                    )}
                  </div>
                  
                  {/* Projected Balance Display */}
                  <div className="w-full text-right overflow-hidden">
                    <span className="font-bold font-albert-sans block truncate text-sm">
                      R$ {Math.round(dayBalance).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <div key={name} className="card-premium p-4 flex flex-col h-[72vh]">
                <h3 className="text-base font-bold font-albert-sans text-neutral-11 capitalize text-center mb-4">
                  {name}
                </h3>
                
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-neutral-08 uppercase mb-1.5">
                  {weekHeaders.map((h) => (
                    <div key={h}>{h}</div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1.5 flex-1">
                  {dayBlocks}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
