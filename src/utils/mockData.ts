import type { Tag, Transaction, PlanningConfig, RealSpends } from '../types';

export const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Salário', color: '#10B981' }, // emerald
  { id: '2', name: 'Alimentação', color: '#EF4444' }, // red
  { id: '3', name: 'Moradia', color: '#F59E0B' }, // amber
  { id: '4', name: 'Lazer', color: '#EC4899' }, // pink
  { id: '5', name: 'Transporte', color: '#3B82F6' }, // blue
  { id: '6', name: 'Investimento', color: '#6366F1' }, // indigo
  { id: '7', name: 'Outros', color: '#6B7280' }, // gray
];

// Helper to format a date relative to today
const getDateRelative = (monthsOffset: number, day: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsOffset);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  
  return `${year}-${month}-${dayStr}`;
};

export const DEFAULT_PLANNING_CONFIG: PlanningConfig = {
  fixedRevenue: 5500,
  fixedExpenses: [
    { id: 'fe1', name: 'Aluguel & Condomínio', value: 1500 },
    { id: 'fe2', name: 'Supermercado Mensal', value: 900 },
    { id: 'fe3', name: 'Plano de Saúde', value: 400 },
    { id: 'fe4', name: 'Internet & Contas', value: 300 },
    { id: 'fe5', name: 'Transporte / Combustível', value: 500 },
  ],
};

export const getMockRealSpends = (): RealSpends => {
  const spends: RealSpends = {};
  
  // Let's seed spends for the past days of this month (from day 1 to today, day 22)
  const today = new Date();
  const dayLimit = today.getDate(); // e.g. 22
  
  const values = [45, 0, 85, 20, 0, 150, 35, 50, 0, 90, 12, 40, 65, 0, 110, 25, 30, 0, 55, 75, 40, 80];
  
  for (let d = 1; d <= dayLimit; d++) {
    const dateStr = getDateRelative(0, d);
    const valIndex = (d - 1) % values.length;
    spends[dateStr] = values[valIndex];
  }
  
  return spends;
};

export const getMockTransactions = (): Transaction[] => {
  return [
    // Current Month (Offset 0)
    {
      id: 't1',
      type: 'entrada',
      value: 4500,
      description: 'Salário Mensal',
      date: getDateRelative(0, 5),
      tagId: '1'
    },
    {
      id: 't2',
      type: 'saida',
      value: 350,
      description: 'Supermercado Semanal',
      date: getDateRelative(0, 8),
      tagId: '2'
    },
    {
      id: 't3',
      type: 'fatura',
      value: 1200,
      description: 'Fatura Cartão Nubank',
      date: getDateRelative(0, 10),
      tagId: '7'
    },
    {
      id: 't4',
      type: 'saida',
      value: 120,
      description: 'Jantar com amigos',
      date: getDateRelative(0, 15),
      tagId: '4'
    },
    {
      id: 't5',
      type: 'economia',
      value: 500,
      description: 'Tesouro Direto Selic',
      date: getDateRelative(0, 22),
      tagId: '6'
    },
    {
      id: 't6',
      type: 'saida',
      value: 80,
      description: 'Uber / Combustível',
      date: getDateRelative(0, 25),
      tagId: '5'
    },

    // Next Month (Offset 1)
    {
      id: 't7',
      type: 'entrada',
      value: 4500,
      description: 'Salário Mensal',
      date: getDateRelative(1, 5),
      tagId: '1'
    },
    {
      id: 't8',
      type: 'saida',
      value: 1100,
      description: 'Aluguel do Apartamento',
      date: getDateRelative(1, 10),
      tagId: '3'
    },
    {
      id: 't9',
      type: 'fatura',
      value: 850,
      description: 'Fatura Cartão Black',
      date: getDateRelative(1, 15),
      tagId: '7'
    },
    {
      id: 't10',
      type: 'entrada',
      value: 1500,
      description: 'Projeto Freelance',
      date: getDateRelative(1, 18),
      tagId: '1'
    },
    {
      id: 't11',
      type: 'economia',
      value: 1000,
      description: 'Ações Bolsa de Valores',
      date: getDateRelative(1, 25),
      tagId: '6'
    },

    // Month After Next (Offset 2)
    {
      id: 't12',
      type: 'entrada',
      value: 4500,
      description: 'Salário Mensal',
      date: getDateRelative(2, 5),
      tagId: '1'
    },
    {
      id: 't13',
      type: 'saida',
      value: 420,
      description: 'Manutenção do Carro',
      date: getDateRelative(2, 12),
      tagId: '5'
    },
    {
      id: 't14',
      type: 'fatura',
      value: 620,
      description: 'Fatura Cartão Nubank',
      date: getDateRelative(2, 10),
      tagId: '7'
    },
    {
      id: 't15',
      type: 'economia',
      value: 800,
      description: 'Previdência Privada',
      date: getDateRelative(2, 28),
      tagId: '6'
    }
  ];
};
