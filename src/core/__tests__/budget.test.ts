import { describe, expect, it } from 'vitest';
import type { Occurrence, Tag, TransactionType } from '../../types';
import { NO_TAG_ID, budgetedCategories, dailyBudgetFrom, monthMetrics, monthlyBudgetTotal, tagTotals } from '../budget';
import { projectBalances } from '../projection';

const occ = (type: TransactionType, value: number, date: string, tagIds: string[] = []): Occurrence => ({
  key: `${type}-${date}-${value}`,
  transactionId: `${type}-${date}-${value}`,
  type,
  value,
  description: type,
  date,
  tagIds,
  virtual: false,
});

describe('orçamento diário', () => {
  const cat = (name: string, monthlyBudget?: number): Tag => ({
    id: name, name, color: '#000', monthlyBudget,
  });

  const categories = [cat('Alimentação', 300), cat('Transporte', 500), cat('Lazer', 200)];

  it('soma o orçamento das categorias e divide pelo divisor configurado', () => {
    expect(monthlyBudgetTotal(categories)).toBe(1000);
    expect(dailyBudgetFrom(categories, { daysDivisor: 30 })).toBe(33.33);
  });

  it('ignora categorias que são só etiqueta, sem orçamento', () => {
    const mixed = [...categories, cat('Presente'), cat('Casamento', 0)];
    expect(monthlyBudgetTotal(mixed)).toBe(1000);
    expect(budgetedCategories(mixed).map((c) => c.name)).toEqual(['Alimentação', 'Transporte', 'Lazer']);
  });

  it('cai no divisor 30 quando o configurado é inválido', () => {
    expect(dailyBudgetFrom([cat('X', 600)], { daysDivisor: 0 })).toBe(20);
  });

  it('devolve zero sem categorias', () => {
    expect(dailyBudgetFrom([], { daysDivisor: 30 })).toBe(0);
  });
});

describe('métricas do mês', () => {
  const projection = projectBalances({
    occurrences: [
      occ('entrada', 5000, '2026-03-05'),
      occ('saida', 2000, '2026-03-10'),
      occ('diario', 50, '2026-03-02'),
      occ('diario', 70, '2026-03-12'),
      occ('economia', 1000, '2026-03-06'),
      occ('cartao', 800, '2026-03-20'),
    ],
    initialBalance: 2000,
    start: '2026-03-01',
    end: '2026-03-31',
    today: '2026-03-15',
    dailyBudget: 100,
  });

  const m = monthMetrics(projection.days);

  it('soma cada tipo do mês', () => {
    expect(m).toMatchObject({ entradas: 5000, saidas: 2000, diarios: 120, economias: 1000, cartao: 800 });
  });

  it('prevê o diário só dos dias que faltam', () => {
    expect(m.diasNoMes).toBe(31);
    expect(m.diasRestantes).toBe(16); // 16 a 31 de março
    expect(m.diarioPrevistoRestante).toBe(1600);
  });

  it('mostra que faltou dinheiro no mês', () => {
    // 5000 - 2000 - 120 - 1000 - 800 - 1600
    expect(m.performance).toBe(-520);
  });

  it('calcula o percentual economizado sobre as entradas', () => {
    expect(m.savingsRate).toBeCloseTo(0.2, 5);
  });

  it('calcula custo de vida e a relação com a renda', () => {
    expect(m.custoDeVida).toBe(4520); // 2000 + 120 + 800 + 1600
    expect(m.custoDeVidaSobreRenda).toBeCloseTo(0.904, 5);
  });

  it('calcula o diário médio sobre os dias do mês', () => {
    expect(m.diarioMedio).toBe(3.87); // 120 / 31
  });

  it('fecha com o saldo inicial e final do mês', () => {
    expect(m.saldoInicial).toBe(2000);
    expect(m.saldoFinal).toBe(1480);
    expect(m.saldoFinal).toBe(projection.finalBalance);
  });

  it('não divide por zero sem entradas', () => {
    const semEntrada = monthMetrics(
      projectBalances({
        occurrences: [occ('saida', 100, '2026-03-10')],
        initialBalance: 0,
        start: '2026-03-01',
        end: '2026-03-31',
        today: '2026-03-15',
      }).days,
    );
    expect(semEntrada.savingsRate).toBe(0);
    expect(semEntrada.custoDeVidaSobreRenda).toBe(0);
  });
});

describe('totais por tag', () => {
  const totals = tagTotals([
    occ('saida', 100, '2026-03-01', ['a']),
    occ('saida', 200, '2026-03-02', ['a', 'b']),
    occ('entrada', 5000, '2026-03-03', ['a']),
    occ('diario', 50, '2026-03-04'),
  ]);

  it('ignora entradas — a pergunta é para onde o dinheiro foi', () => {
    expect(totals.find((t) => t.tagId === 'a')?.total).toBe(300);
  });

  it('soma o valor cheio em cada tag de uma movimentação multi-tag', () => {
    expect(totals.find((t) => t.tagId === 'b')?.total).toBe(200);
  });

  it('agrupa o que não tem tag', () => {
    expect(totals.find((t) => t.tagId === NO_TAG_ID)?.total).toBe(50);
  });

  it('ordena do maior para o menor com a participação de cada um', () => {
    expect(totals.map((t) => t.tagId)).toEqual(['a', 'b', NO_TAG_ID]);
    expect(totals[0].share).toBeCloseTo(300 / 550, 5);
    expect(totals[0].count).toBe(2);
  });

  it('devolve lista vazia sem ocorrências', () => {
    expect(tagTotals([])).toEqual([]);
  });
});
