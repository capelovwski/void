import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, CreditCard, PiggyBank, Target, 
  GripVertical, SlidersHorizontal, ArrowUp, ArrowDown, Maximize2, Minimize2, Briefcase,
  TrendingUp, Plus, Trash2, Edit2, X, Check
} from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import type { Transaction, Tag, Bank } from '../types';
import { CATEGORY_ICONS } from './PlanejamentoTab';

interface RelatoriosTabProps {
  transactions: Transaction[];
  tags: Tag[];
  initialBalance: number;
  banks: Bank[];
  onUpdateBanks: (newBanks: Bank[]) => void;
  theme: 'dark' | 'light';
}

interface WidgetWrapperProps {
  id: string;
  widgetSizes: Record<string, 'half' | 'full'>;
  toggleWidgetSize: (id: string) => void;
  renderWidgetContent: (id: string) => React.ReactNode;
}

const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  id,
  widgetSizes,
  toggleWidgetSize,
  renderWidgetContent
}) => {
  const dragControls = useDragControls();

  // Determine grid span based on widget size config
  const sizeClass = widgetSizes[id] === 'half' ? 'col-span-1' : 'col-span-1 desktop:col-span-2';

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={dragControls}
      className={`relative ${sizeClass}`}
      whileDrag={{
        scale: 1.02,
        rotate: [-1.2, 1.2],
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        opacity: 0.85,
        zIndex: 50,
        transition: {
          rotate: {
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.15,
            ease: "easeInOut"
          }
        }
      }}
    >
      {/* Outer drag card wrapper styling */}
      <div className="relative group h-full">
        {/* Visual drag handle top-bar */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab active:cursor-grabbing p-1 bg-neutral-00 rounded-lg border border-neutral-03 shadow-sm text-neutral-04 hover:text-neutral-08"
            title="Arraste para reposicionar widget"
          >
            <GripVertical size={14} />
          </div>
          
          {id !== 'summary' && id !== 'savings_rate' && (
            <button
              onClick={() => toggleWidgetSize(id)}
              className="p-1 bg-neutral-00 rounded-lg border border-neutral-03 shadow-sm hover:bg-neutral-01 text-neutral-06 hover:text-neutral-10 flex items-center justify-center"
              title="Alternar Tamanho"
            >
              {widgetSizes[id] === 'full' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
        </div>

        {/* Render the actual widget inside size class container */}
        <div className="w-full h-full">
          {renderWidgetContent(id)}
        </div>
      </div>
    </Reorder.Item>
  );
};

export const RelatoriosTab: React.FC<RelatoriosTabProps> = ({
  transactions,
  tags,
  initialBalance,
  banks,
  onUpdateBanks,
  theme,
}) => {
  const isDark = theme === 'dark';
  const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E5E5';
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.2)' : '#AEAEAE';
  const textFillColor = isDark ? '#A3A3A3' : '#605F5F'; // neutral-06 / neutral-10
  const lineColor = isDark ? '#FAFAFA' : '#1A1A1A'; // neutral-11
  const donutBgColor = isDark ? 'rgba(255, 255, 255, 0.06)' : '#EEEEEE';
  // 1. Core Financial Calculations
  const sumByType = (type: Transaction['type']) => {
    return transactions
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + t.value, 0);
  };

  const totalEntradas = sumByType('entrada');
  const totalSaidas = sumByType('saida');
  const totalFaturas = sumByType('fatura');
  const totalEconomias = sumByType('economia');
  const totalDespesas = totalSaidas + totalFaturas;

  // Savings rate = Economias / Receitas
  const savingsRate = totalEntradas > 0 ? (totalEconomias / totalEntradas) * 100 : 0;

  // 2. SVG Donut Chart Calculation (Expenses by Tag)
  const getExpensesByTag = () => {
    const expenseTransactions = transactions.filter((t) => t.type === 'saida' || t.type === 'fatura');
    const totals: { [tagId: string]: number } = {};
    let grandTotal = 0;

    expenseTransactions.forEach((t) => {
      const tagId = t.tagId || 'outros';
      totals[tagId] = (totals[tagId] || 0) + t.value;
      grandTotal += t.value;
    });

    if (grandTotal === 0) return [];

    let currentAngle = 0;
    return Object.entries(totals).map(([tagId, val]) => {
      const tag = tags.find((t) => t.id === tagId) || { name: 'Outros', color: '#6B7280', icon: 'briefcase' };
      const percentage = (val / grandTotal) * 100;
      const angle = (val / grandTotal) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        name: tag.name,
        color: tag.color,
        icon: tag.icon || 'briefcase',
        value: val,
        percentage,
        startAngle,
        angle,
      };
    });
  };

  const tagData = getExpensesByTag();

  // 3. SVG Line Chart Calculation (Projected Balance Progression)
  const getTimelineData = () => {
    const today = new Date();
    const dates: { dateStr: string; label: string }[] = [];
    
    for (let i = 0; i <= 90; i += 3) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      dates.push({ dateStr, label });
    }

    const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    let currentBal = initialBalance;
    let transactionIndex = 0;

    return dates.map((point) => {
      while (
        transactionIndex < sortedTransactions.length &&
        sortedTransactions[transactionIndex].date <= point.dateStr
      ) {
        const t = sortedTransactions[transactionIndex];
        if (t.type === 'entrada') {
          currentBal += t.value;
        } else {
          currentBal -= t.value;
        }
        transactionIndex++;
      }

      return {
        label: point.label,
        balance: currentBal,
      };
    });
  };

  const timelineData = getTimelineData();

  // SVG dimensions & paths for Line Chart
  const svgWidth = 500;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 20;

  const minBalance = Math.min(...timelineData.map((d) => d.balance), 0);
  const maxBalance = Math.max(...timelineData.map((d) => d.balance), 1000);
  const balanceRange = maxBalance - minBalance || 1;

  const getPointsPath = () => {
    return timelineData
      .map((d, index) => {
        const x = paddingX + (index / (timelineData.length - 1)) * (svgWidth - paddingX * 2);
        const y = svgHeight - paddingY - ((d.balance - minBalance) / balanceRange) * (svgHeight - paddingY * 2);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const points = getPointsPath();
  const pointsList = points.split(' ');
  const linePath = pointsList.length > 0 ? `M ${pointsList[0].replace(',', ' ')} L ` + pointsList.slice(1).map(p => p.replace(',', ' ')).join(' L ') : '';
  const areaPath = pointsList.length > 0 ? `${linePath} L ${svgWidth - paddingX} ${svgHeight - paddingY} L ${paddingX} ${svgHeight - paddingY} Z` : '';

  // 4. Bank Management States and Helpers
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankColor, setBankColor] = useState('#8A05BE');
  const [bankBalance, setBankBalance] = useState('');

  const COLOR_PRESETS = [
    '#8A05BE', // Nubank Purple
    '#EC7000', // Itaú Orange
    '#FFC000', // XP Gold
    '#0070F3', // Vibrant Blue
    '#10B981', // Emerald Green
    '#EF4444', // Vibrant Red
    '#EC4899', // Hot Pink
    '#06B6D4', // Cyan
  ];

  const handleSaveBank = () => {
    if (!bankName.trim()) return;
    const parsedBalance = parseFloat(bankBalance) || 0;

    let updatedBanks: Bank[];
    if (editingBank) {
      updatedBanks = banks.map((b) =>
        b.id === editingBank.id
          ? { ...b, name: bankName, color: bankColor, balance: parsedBalance }
          : b
      );
    } else {
      const newBank: Bank = {
        id: `bank-${Date.now()}`,
        name: bankName,
        color: bankColor,
        balance: parsedBalance
      };
      updatedBanks = [...banks, newBank];
    }

    onUpdateBanks(updatedBanks);
    
    // Reset Form
    setBankName('');
    setBankColor(COLOR_PRESETS[0]);
    setBankBalance('');
    setEditingBank(null);
  };

  const handleStartEditBank = (bank: Bank) => {
    setEditingBank(bank);
    setBankName(bank.name);
    setBankColor(bank.color);
    setBankBalance(bank.balance.toString());
  };

  const handleCancelEdit = () => {
    setEditingBank(null);
    setBankName('');
    setBankColor(COLOR_PRESETS[0]);
    setBankBalance('');
  };

  const handleDeleteBank = (id: string) => {
    const updatedBanks = banks.filter((b) => b.id !== id);
    onUpdateBanks(updatedBanks);
    if (editingBank?.id === id) {
      handleCancelEdit();
    }
  };

  // 5. Dashboard Modular States
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    'summary',
    'savings_rate',
    'timeline_chart',
    'expenses_chart',
    'multi_banks'
  ]);

  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>({
    summary: true,
    savings_rate: true,
    timeline_chart: true,
    expenses_chart: true,
    multi_banks: true,
  });

  const [widgetSizes, setWidgetSizes] = useState<Record<string, 'half' | 'full'>>({
    timeline_chart: 'half',
    expenses_chart: 'half',
    multi_banks: 'full',
  });

  const [showFilters, setShowFilters] = useState(false);

  // 6. Customization Handlers

  const toggleWidgetSize = (id: string) => {
    setWidgetSizes(prev => ({
      ...prev,
      [id]: prev[id] === 'full' ? 'half' : 'full',
    }));
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId === targetId) return;

    const newOrder = [...widgetOrder];
    const sourceIndex = newOrder.indexOf(sourceId);
    const targetIndex = newOrder.indexOf(targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    newOrder[sourceIndex] = targetId;
    newOrder[targetIndex] = sourceId;
    setWidgetOrder(newOrder);
  };

  const getWidgetLabel = (id: string) => {
    switch (id) {
      case 'summary': return 'Resumo Rápido';
      case 'savings_rate': return 'Taxa de Poupança';
      case 'timeline_chart': return 'Projeção de Saldo';
      case 'expenses_chart': return 'Distribuição de Despesas';
      case 'multi_banks': return 'Custódia Multi-Bancos';
      default: return id;
    }
  };

  // Render Functions for Widgets
  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'summary':
        return (
          <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
            {/* Receitas */}
            <div className="card-premium p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-08">
                <span className="text-xs font-semibold uppercase tracking-wider">Entradas</span>
                <div className="p-1.5 rounded-lg bg-success/10 text-success">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-10 block">Total Recebido</span>
                <span className="text-lg font-bold font-albert-sans text-neutral-11">
                  R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Despesas de Débito */}
            <div className="card-premium p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-08">
                <span className="text-xs font-semibold uppercase tracking-wider">Saídas</span>
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                  <ArrowDownRight size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-10 block">Total no Débito</span>
                <span className="text-lg font-bold font-albert-sans text-neutral-11">
                  R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Crédito/Fatura */}
            <div className="card-premium p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-08">
                <span className="text-xs font-semibold uppercase tracking-wider">Cartão</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <CreditCard size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-10 block">Total de Faturas</span>
                <span className="text-lg font-bold font-albert-sans text-neutral-11">
                  R$ {totalFaturas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Economias */}
            <div className="card-premium p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-08">
                <span className="text-xs font-semibold uppercase tracking-wider">Economias</span>
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400">
                  <PiggyBank size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-10 block">Investimentos</span>
                <span className="text-lg font-bold font-albert-sans text-neutral-11">
                  R$ {totalEconomias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        );

      case 'savings_rate':
        return (
          <div className="card-premium p-6 flex flex-col tablet:flex-row items-center gap-6">
            <div className="p-4 rounded-full bg-main/20 text-neutral-11">
              <Target size={32} />
            </div>
            <div className="flex-1 space-y-2 w-full">
              <div className="flex justify-between items-baseline">
                <h3 className="text-base font-bold font-albert-sans text-neutral-11">
                  Taxa de Poupança / Investimento
                </h3>
                <span className="text-lg font-bold text-violet-500 dark:text-violet-400 font-albert-sans">
                  {savingsRate.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full h-3 bg-neutral-02 rounded-full overflow-hidden border border-neutral-03/40">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-main rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(savingsRate, 100)}%` }}
                />
              </div>

              <p className="text-xs text-neutral-08">
                {savingsRate > 20 
                  ? 'Excelente! Você está poupando mais de 20% das suas receitas. Continue assim!'
                  : 'Dica: Tente direcionar pelo menos 10% a 20% de suas entradas para a aba de Economia.'}
              </p>
            </div>
          </div>
        );

      case 'timeline_chart':
        return (
          <div className="card-premium p-6 space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-albert-sans text-neutral-11">
                Projeção de Saldo (Próximos 90 Dias)
              </h3>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-2">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FEF7AF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FEF7AF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke={gridLineColor} strokeDasharray="3,3" />
                <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke={gridLineColor} strokeDasharray="3,3" />
                <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke={axisColor} />

                {areaPath && (
                  <path d={areaPath} fill="url(#chartGradient)" />
                )}

                {linePath && (
                  <path d={linePath} fill="none" stroke={isDark ? '#FEF7AF' : '#8B5CF6'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {timelineData.map((d, index) => {
                  const x = paddingX + (index / (timelineData.length - 1)) * (svgWidth - paddingX * 2);
                  const y = svgHeight - paddingY - ((d.balance - minBalance) / balanceRange) * (svgHeight - paddingY * 2);
                  
                  if (index === 0 || index === Math.floor(timelineData.length / 2) || index === timelineData.length - 1) {
                    return (
                      <g key={`dot-${index}`}>
                        <circle cx={x} cy={y} r="5" fill={isDark ? '#18181B' : '#FFFFFF'} stroke={isDark ? '#FEF7AF' : '#8B5CF6'} strokeWidth="1.5" />
                        <text x={x} y={y - 10} textAnchor="middle" className="text-[10px] font-bold" fill={isDark ? '#FAFAFA' : '#1A1A1A'}>
                          R$ {Math.round(d.balance).toLocaleString('pt-BR')}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })}

                <text x={paddingX} y={svgHeight - 4} textAnchor="start" className="text-[10px] font-medium" fill={textFillColor}>
                  Hoje
                </text>
                <text x={svgWidth / 2} y={svgHeight - 4} textAnchor="middle" className="text-[10px] font-medium" fill={textFillColor}>
                  +45 dias
                </text>
                <text x={svgWidth - paddingX} y={svgHeight - 4} textAnchor="end" className="text-[10px] font-medium" fill={textFillColor}>
                  +90 dias
                </text>
              </svg>
            </div>
            <p className="text-xs text-neutral-08 text-center italic">
              Evolução do saldo da sua carteira projetando todas as entradas e saídas lançadas no calendário.
            </p>
          </div>
        );

      case 'expenses_chart':
        return (
          <div className="card-premium p-6 space-y-4 flex flex-col h-full">
            <h3 className="text-base font-bold font-albert-sans text-neutral-11">
              Distribuição de Despesas (Débito + Cartão)
            </h3>

            {tagData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-neutral-08 py-12">
                Nenhuma despesa lançada para categorizar.
              </div>
            ) : (
              <div className="flex-1 flex flex-col tablet:flex-row items-center justify-center gap-6">
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke={donutBgColor} strokeWidth="12" />
                    
                    {tagData.map((slice) => {
                      const radius = 40;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDasharray = `${(slice.value / tagData.reduce((s, d) => s + d.value, 0)) * circumference} ${circumference}`;
                      
                      const prevSlices = tagData.slice(0, tagData.indexOf(slice));
                      const totalPrevVal = prevSlices.reduce((s, d) => s + d.value, 0);
                      const strokeDashoffset = -((totalPrevVal / tagData.reduce((s, d) => s + d.value, 0)) * circumference);

                      return (
                        <circle
                          key={slice.name}
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="12"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 hover:stroke-[14px] cursor-pointer"
                        >
                          <title>{`${slice.name}: ${slice.percentage.toFixed(1)}%`}</title>
                        </circle>
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-neutral-08 font-bold uppercase">Total</span>
                    <span className="text-sm font-bold text-neutral-11 font-albert-sans">
                      R$ {totalDespesas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 w-full max-h-[200px] overflow-y-auto pr-1">
                  {tagData.map((slice) => {
                    const IconComponent = CATEGORY_ICONS[slice.icon as keyof typeof CATEGORY_ICONS] || Briefcase;
                    return (
                      <div key={slice.name} className="flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px]"
                            style={{ backgroundColor: slice.color + '15', color: slice.color }}
                          >
                            <IconComponent size={10} />
                          </div>
                          <span className="font-medium text-neutral-10 truncate">{slice.name}</span>
                        </div>
                        <span className="font-bold text-neutral-11 text-right flex-shrink-0">
                          R$ {slice.value.toLocaleString('pt-BR')} ({slice.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'multi_banks':
        return (
          <div className="card-premium p-6 space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-albert-sans text-neutral-11">
                Custódia & Faturas Multi-Bancos
              </h3>
              
              <button
                onClick={() => {
                  setBankName('');
                  setBankColor(COLOR_PRESETS[0]);
                  setBankBalance('');
                  setEditingBank(null);
                  setIsBankModalOpen(true);
                }}
                className="btn-outline px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5"
              >
                <Plus size={10} />
                <span>Gerenciar Bancos</span>
              </button>
            </div>

            <div className={`grid gap-4 ${widgetSizes['multi_banks'] === 'half' ? 'grid-cols-1' : 'grid-cols-1 tablet:grid-cols-3'}`}>
              {banks.map((bank) => {
                const totalBankBalances = banks.reduce((sum, b) => sum + b.balance, 0) || 1;
                const bankFatura = totalFaturas * (bank.balance / totalBankBalances);
                const bankInvestimentos = totalEconomias * (bank.balance / totalBankBalances);
                
                return (
                  <div key={bank.id} className="p-4 rounded-xl border border-neutral-02 bg-neutral-01/30 space-y-3 relative overflow-hidden transition-all hover:border-neutral-04">
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: bank.color }} />
                    
                    <div className="flex items-center justify-between border-b border-neutral-02/60 pb-2">
                      <span className="text-xs font-bold font-albert-sans text-neutral-11 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bank.color }} />
                        {bank.name}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-08">Fatura Cartão:</span>
                        <span className="font-semibold text-neutral-11">
                          R$ {bankFatura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-08">Investimentos:</span>
                        <span className="font-semibold text-violet-500 dark:text-violet-400">
                          R$ {bankInvestimentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-neutral-02/30 pt-1.5">
                        <span className="text-neutral-08 font-medium">Saldo Líquido:</span>
                        <span className="font-bold text-success">
                          R$ {bank.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {banks.length === 0 && (
              <p className="text-xs text-neutral-08 text-center py-6">
                Nenhuma instituição cadastrada. Clique em \"Gerenciar Bancos\" para iniciar.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto w-full animate-appear">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-albert-sans text-neutral-11 flex items-center gap-2">
            <TrendingUp size={20} className="text-neutral-08" />
            <span>Painel Analítico</span>
          </h2>
          <p className="text-[11px] text-neutral-08">Consulte suas faturas, investimentos e taxas com widgets modulares customizáveis.</p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-outline px-3 py-2 text-[10px] font-semibold flex items-center gap-1.5"
        >
          <SlidersHorizontal size={12} />
          <span>Ativar / Desativar Widgets</span>
        </button>
      </div>

      {/* Dynamic Filters Menu Panel */}
      {showFilters && (
        <div className="card-premium p-4 bg-neutral-01 border border-neutral-03/80 flex flex-col gap-4 animate-appear">
          <div className="flex items-center justify-between border-b border-neutral-02 pb-2">
            <span className="text-xs font-bold text-neutral-10 uppercase tracking-wider">Ativar/Desativar Widgets no Relatório</span>
            <button onClick={() => setShowFilters(false)} className="text-[10px] text-neutral-08 hover:text-neutral-11 font-bold">Fechar</button>
          </div>
          <div className="grid grid-cols-2 tablet:grid-cols-5 gap-3">
            {Object.keys(visibleWidgets).map((id) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-11 hover:text-neutral-12">
                <input
                  type="checkbox"
                  checked={visibleWidgets[id]}
                  onChange={() => setVisibleWidgets(prev => ({ ...prev, [id]: !prev[id] }))}
                  className="rounded border-neutral-03 text-neutral-11 focus:ring-neutral-11 w-4 h-4 cursor-pointer"
                />
                <span>{getWidgetLabel(id)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Main Drag-and-Drop Customizable Grid with Framer Motion */}
      <Reorder.Group
        axis="y"
        values={widgetOrder}
        onReorder={setWidgetOrder}
        className="grid grid-cols-1 desktop:grid-cols-2 gap-6"
      >
        {widgetOrder.map((id) => {
          if (!visibleWidgets[id]) return null;

          return (
            <WidgetWrapper
              key={id}
              id={id}
              widgetSizes={widgetSizes}
              toggleWidgetSize={toggleWidgetSize}
              renderWidgetContent={renderWidgetContent}
            />
          );
        })}
      </Reorder.Group>

      {/* Modal de Gerenciamento de Bancos */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-appear">
          <div className="bg-neutral-00 rounded-3xl border border-neutral-03/80 shadow-2xl p-6 w-full max-w-lg flex flex-col max-h-[85vh] cursor-default">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-02 pb-3 mb-4">
              <h3 className="text-base font-bold text-neutral-11 flex items-center gap-2">
                <PiggyBank size={18} className="text-neutral-08" />
                <span>Gerenciar Bancos e Saldos</span>
              </h3>
              <button
                onClick={() => {
                  setIsBankModalOpen(false);
                  setEditingBank(null);
                }}
                className="text-neutral-08 hover:text-neutral-11 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable list of existing banks */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
              {banks.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between p-3 rounded-2xl border border-neutral-02 bg-neutral-01/30">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: bank.color }} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-11">{bank.name}</span>
                      <span className="text-[10px] text-neutral-08">
                        Saldo: R$ {bank.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEditBank(bank)}
                      className="p-1.5 rounded-lg border border-neutral-03/60 text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 transition-all"
                      title="Editar Banco"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteBank(bank.id)}
                      className="p-1.5 rounded-lg border border-neutral-03/60 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Excluir Banco"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {banks.length === 0 && (
                <p className="text-xs text-neutral-08 text-center py-4">Nenhum banco cadastrado. Adicione um abaixo!</p>
              )}
            </div>

            {/* Form to Add/Edit Bank */}
            <div className="border-t border-neutral-02 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-neutral-10 uppercase tracking-wider">
                {editingBank ? 'Editar Banco' : 'Adicionar Novo Banco'}
              </h4>
              
              <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-08 font-bold block mb-1">Nome do Banco</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú..."
                    className="w-full bg-neutral-01 border border-neutral-02 hover:border-neutral-03 focus:border-neutral-11 rounded-xl px-3 py-2 text-xs text-neutral-11 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-08 font-bold block mb-1">Saldo Atual (R$)</label>
                  <input
                    type="number"
                    step="any"
                    value={bankBalance}
                    onChange={(e) => setBankBalance(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-neutral-01 border border-neutral-02 hover:border-neutral-03 focus:border-neutral-11 rounded-xl px-3 py-2 text-xs text-neutral-11 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Color Identity Selector */}
              <div>
                <label className="text-[10px] text-neutral-08 font-bold block mb-1.5">Cor de Identidade</label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBankColor(color)}
                      className={`w-7 h-7 rounded-full border transition-all ${
                        bankColor === color 
                          ? 'ring-2 ring-neutral-11 scale-110 border-white' 
                          : 'border-black/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  
                  {/* Custom Color Picker Button */}
                  <label className="relative cursor-pointer flex items-center justify-center w-7 h-7 rounded-full border border-neutral-03 hover:scale-105 transition-all bg-neutral-01">
                    <span className="text-[9px] text-neutral-08 font-bold">Custom</span>
                    <input
                      type="color"
                      value={bankColor}
                      onChange={(e) => setBankColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Actions for Form */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {editingBank && (
                  <button
                    onClick={() => handleCancelEdit()}
                    className="btn-outline px-4 py-2 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => handleSaveBank()}
                  disabled={!bankName.trim()}
                  className="btn-filled-main px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {editingBank ? 'Atualizar Banco' : 'Adicionar Banco'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
