import { describe, expect, it } from 'vitest';
import type { Occurrence, Transaction, TransactionType } from '../../types';
import { buildProjection } from '../index';
import { balanceLevel, projectBalances } from '../projection';

const TODAY = '2026-03-15';
const MARCH = { start: '2026-03-01', end: '2026-03-31' };

const occ = (type: TransactionType, value: number, date: string, over: Partial<Occurrence> = {}): Occurrence => ({
  key: `${type}-${date}-${value}`,
  transactionId: `${type}-${date}`,
  type,
  value,
  description: type,
  date,
  tagIds: [],
  virtual: false,
  ...over,
});

const project = (occurrences: Occurrence[], initialBalance = 1000, dailyBudget = 0) =>
  projectBalances({ occurrences, initialBalance, ...MARCH, today: TODAY, dailyBudget });

describe('cascata de saldo', () => {
  it('arrasta o saldo do dia anterior', () => {
    const p = project([occ('entrada', 500, '2026-03-05'), occ('saida', 200, '2026-03-10')]);

    expect(p.byDate['2026-03-04'].balance).toBe(1000);
    expect(p.byDate['2026-03-05'].balance).toBe(1500);
    expect(p.byDate['2026-03-09'].balance).toBe(1500);
    expect(p.byDate['2026-03-10'].balance).toBe(1300);
    expect(p.finalBalance).toBe(1300);
  });

  it('trata economia como saída do disponível', () => {
    const p = project([occ('economia', 300, '2026-03-02')]);
    expect(p.finalBalance).toBe(700);
    expect(p.byDate['2026-03-02'].economias).toBe(300);
  });

  it('separa os totais por tipo no mesmo dia', () => {
    const day = project([
      occ('entrada', 100, '2026-03-02'),
      occ('saida', 20, '2026-03-02'),
      occ('diario', 30, '2026-03-02'),
      occ('economia', 40, '2026-03-02'),
      occ('cartao', 50, '2026-03-02'),
    ]).byDate['2026-03-02'];

    expect(day).toMatchObject({ entradas: 100, saidas: 20, diarios: 30, economias: 40, cartao: 50 });
    expect(day.net).toBe(-40);
  });

  it('ignora ocorrências fora do intervalo', () => {
    const p = project([occ('entrada', 999, '2026-02-20'), occ('entrada', 999, '2026-04-02')]);
    expect(p.finalBalance).toBe(1000);
  });
});

describe('gasto no cartão', () => {
  it('debita no vencimento da fatura, não na data da compra', () => {
    const p = project([
      occ('cartao', 800, '2026-03-20', { purchaseDate: '2026-03-02', cardId: 'c1' }),
    ]);

    expect(p.byDate['2026-03-02'].cartao).toBe(0);
    expect(p.byDate['2026-03-02'].balance).toBe(1000);
    expect(p.byDate['2026-03-20'].cartao).toBe(800);
    expect(p.byDate['2026-03-20'].balance).toBe(200);
  });
});

describe('previsão de gasto diário', () => {
  it('aplica o orçamento só nos dias futuros', () => {
    const p = project([], 1000, 100);

    expect(p.byDate['2026-03-10'].diarioPrevisto).toBe(0); // passado
    expect(p.byDate['2026-03-15'].diarioPrevisto).toBe(0); // hoje
    expect(p.byDate['2026-03-16'].diarioPrevisto).toBe(100); // futuro

    // 16 dias futuros (16 a 31) x R$ 100
    expect(p.finalBalance).toBe(-600);
  });

  it('não soma o orçamento por cima de um dia futuro que já tem diários lançados', () => {
    const p = project([occ('diario', 250, '2026-03-20')], 1000, 100);
    const day = p.byDate['2026-03-20'];

    expect(day.diarios).toBe(250);
    expect(day.diarioPrevisto).toBe(0);
    expect(day.net).toBe(-250);
  });

  it('completa o que falta para o orçamento num dia futuro parcialmente lançado', () => {
    const day = project([occ('diario', 30, '2026-03-20')], 1000, 100).byDate['2026-03-20'];

    expect(day.diarioPrevisto).toBe(70);
    expect(day.net).toBe(-100);
  });

  it('no passado desconta só o que foi lançado', () => {
    const day = project([occ('diario', 30, '2026-03-10')], 1000, 100).byDate['2026-03-10'];

    expect(day.diarioPrevisto).toBe(0);
    expect(day.net).toBe(-30);
  });
});

describe('alertas do horizonte', () => {
  it('aponta o primeiro dia em que o saldo vira negativo', () => {
    const p = project([occ('saida', 1200, '2026-03-08'), occ('entrada', 5000, '2026-03-25')]);

    expect(p.firstNegativeDate).toBe('2026-03-08');
    expect(p.lowestBalance).toEqual({ date: '2026-03-08', balance: -200 });
    expect(p.finalBalance).toBe(4800);
  });

  it('devolve null quando o saldo nunca fica negativo', () => {
    expect(project([]).firstNegativeDate).toBeNull();
  });
});

describe('marcação temporal dos dias', () => {
  it('classifica passado, hoje e futuro', () => {
    const p = project([]);
    expect(p.byDate['2026-03-14']).toMatchObject({ isPast: true, isToday: false, isFuture: false });
    expect(p.byDate['2026-03-15']).toMatchObject({ isPast: false, isToday: true, isFuture: false });
    expect(p.byDate['2026-03-16']).toMatchObject({ isPast: false, isToday: false, isFuture: true });
  });
});

describe('pureza', () => {
  it('não muta a entrada e repete o resultado', () => {
    const occurrences = [occ('saida', 100, '2026-03-05')];
    const snapshot = JSON.parse(JSON.stringify(occurrences));

    const a = project(occurrences);
    const b = project(occurrences);

    expect(occurrences).toEqual(snapshot);
    expect(a.days.map((d) => d.balance)).toEqual(b.days.map((d) => d.balance));
  });

  it('soma centavos sem arrastar erro de ponto flutuante', () => {
    const p = project([occ('saida', 0.1, '2026-03-02'), occ('saida', 0.2, '2026-03-03')], 1);
    expect(p.finalBalance).toBe(0.7);
  });
});

describe('buildProjection (caminho completo)', () => {
  it('expande recorrência e parcelamento antes de projetar', () => {
    const transactions: Transaction[] = [
      { id: 'salario', type: 'entrada', value: 5000, description: 'Salário', date: '2026-03-05', recurrence: 'mensal' },
      { id: 'aluguel', type: 'saida', value: 2000, description: 'Aluguel', date: '2026-03-10', recurrence: 'mensal' },
      { id: 'tv', type: 'cartao', value: 500, description: 'TV', date: '2026-04-05', cardId: 'c1', purchaseDate: '2026-03-02', recurrence: 'parcelado', installmentCount: 3, installmentTotal: 1500 },
    ];

    const { projection, occurrences } = buildProjection({
      transactions,
      initialBalance: 0,
      start: '2026-03-01',
      end: '2026-06-30',
      today: TODAY,
      dailyBudget: 0,
    });

    // 4 salários + 4 aluguéis + 3 parcelas
    expect(occurrences).toHaveLength(11);
    expect(projection.byDate['2026-04-05'].cartao).toBe(500);
    expect(projection.byDate['2026-06-05'].cartao).toBe(500);
    expect(projection.byDate['2026-07-05']).toBeUndefined();

    // 4 x (5000 - 2000) - 3 x 500
    expect(projection.finalBalance).toBe(10500);
  });
});

describe('balanceLevel', () => {
  it('classifica o saldo nas faixas do mapa de calor', () => {
    expect(balanceLevel(-1)).toBe('neg');
    expect(balanceLevel(0)).toBe('crit');
    expect(balanceLevel(99)).toBe('crit');
    expect(balanceLevel(100)).toBe('warn');
    expect(balanceLevel(300)).toBe('ok');
    expect(balanceLevel(5000)).toBe('high');
  });
});
