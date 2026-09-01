import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import { expandTransactions, groupByDate, normalizeTagIds, normalizeType } from '../recurrence';

const RANGE = { start: '2026-01-01', end: '2026-12-31' };

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  type: 'saida',
  value: 100,
  description: 'Teste',
  date: '2026-01-15',
  ...over,
});

describe('sem recorrência', () => {
  it('gera uma ocorrência e reaproveita o id como chave', () => {
    const [occ] = expandTransactions([tx()], RANGE);
    expect(occ.date).toBe('2026-01-15');
    expect(occ.key).toBe('t1');
    expect(occ.virtual).toBe(false);
  });

  it('descarta o que está fora do intervalo', () => {
    expect(expandTransactions([tx({ date: '2025-12-31' })], RANGE)).toHaveLength(0);
    expect(expandTransactions([tx({ date: '2027-01-01' })], RANGE)).toHaveLength(0);
  });
});

describe('recorrência mensal', () => {
  it('repete todo mês até o fim do intervalo', () => {
    const occs = expandTransactions([tx({ date: '2026-01-10', recurrence: 'mensal' })], RANGE);
    expect(occs).toHaveLength(12);
    expect(occs[0].date).toBe('2026-01-10');
    expect(occs[11].date).toBe('2026-12-10');
  });

  it('volta ao dia 31 depois de fevereiro em vez de arrastar o dia 28', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-31', recurrence: 'mensal' })],
      { start: '2026-01-01', end: '2026-04-30' },
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('respeita recurrenceEnd', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-10', recurrence: 'mensal', recurrenceEnd: '2026-03-31' })],
      RANGE,
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-01-10', '2026-02-10', '2026-03-10']);
  });

  it('não gera ocorrências antes da âncora quando o intervalo começa antes', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-06-10', recurrence: 'mensal' })],
      RANGE,
    );
    expect(occs[0].date).toBe('2026-06-10');
    expect(occs).toHaveLength(7);
  });

  it('avança direto para o intervalo pedido sem varrer o passado inteiro', () => {
    const occs = expandTransactions(
      [tx({ date: '2020-01-10', recurrence: 'mensal' })],
      { start: '2026-03-01', end: '2026-05-31' },
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-03-10', '2026-04-10', '2026-05-10']);
  });
});

describe('recorrência semanal e diária', () => {
  it('semanal cai sempre no mesmo dia da semana', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-05', recurrence: 'semanal' })],
      { start: '2026-01-01', end: '2026-02-02' },
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02']);
  });

  it('semanal alinha na grade da âncora mesmo começando o intervalo no meio', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-05', recurrence: 'semanal' })],
      { start: '2026-01-20', end: '2026-02-10' },
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-01-26', '2026-02-02', '2026-02-09']);
  });

  it('diária preenche todos os dias do intervalo', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-01', recurrence: 'diaria', recurrenceEnd: '2026-01-10' })],
      RANGE,
    );
    expect(occs).toHaveLength(10);
  });
});

describe('parcelamento', () => {
  it('gera uma parcela por mês, numeradas', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-20', recurrence: 'parcelado', value: 250, installmentCount: 4, installmentTotal: 1000 })],
      RANGE,
    );
    expect(occs).toHaveLength(4);
    expect(occs.map((o) => o.date)).toEqual(['2026-01-20', '2026-02-20', '2026-03-20', '2026-04-20']);
    expect(occs.map((o) => o.installmentIndex)).toEqual([1, 2, 3, 4]);
    expect(occs.every((o) => o.installmentCount === 4 && o.value === 250)).toBe(true);
  });

  it('divide o total exato entre as parcelas, sem perder centavos', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-20', recurrence: 'parcelado', value: 33.33, installmentCount: 3, installmentTotal: 100 })],
      RANGE,
    );
    expect(occs.map((o) => o.value)).toEqual([33.34, 33.33, 33.33]);
    expect(occs.reduce((sum, o) => sum + o.value, 0)).toBeCloseTo(100, 5);
  });

  it('usa o valor da parcela quando não há total gravado', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-20', recurrence: 'parcelado', value: 250, installmentCount: 2 })],
      RANGE,
    );
    expect(occs.map((o) => o.value)).toEqual([250, 250]);
  });

  it('corta as parcelas que passam do fim do intervalo', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-11-20', recurrence: 'parcelado', value: 100, installmentCount: 6 })],
      RANGE,
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-11-20', '2026-12-20']);
  });
});

describe('ocorrências removidas individualmente', () => {
  it('skipDates tira só a data listada', () => {
    const occs = expandTransactions(
      [tx({ date: '2026-01-10', recurrence: 'mensal', skipDates: ['2026-03-10'] })],
      { start: '2026-01-01', end: '2026-04-30' },
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-01-10', '2026-02-10', '2026-04-10']);
  });
});

describe('compatibilidade com o modelo antigo', () => {
  it('lê `fatura` como `cartao`', () => {
    expect(normalizeType('fatura')).toBe('cartao');
    const [occ] = expandTransactions([tx({ type: 'fatura' })], RANGE);
    expect(occ.type).toBe('cartao');
  });

  it('promove a tag única para a lista de tags', () => {
    expect(normalizeTagIds({ tagId: 'a' })).toEqual(['a']);
    expect(normalizeTagIds({ tagIds: ['a', 'b'], tagId: 'c' })).toEqual(['a', 'b']);
    expect(normalizeTagIds({})).toEqual([]);
  });
});

describe('ordenação e agrupamento', () => {
  it('devolve tudo ordenado por data', () => {
    const occs = expandTransactions(
      [tx({ id: 'b', date: '2026-05-01' }), tx({ id: 'a', date: '2026-02-01' })],
      RANGE,
    );
    expect(occs.map((o) => o.date)).toEqual(['2026-02-01', '2026-05-01']);
  });

  it('groupByDate indexa por dia', () => {
    const occs = expandTransactions(
      [tx({ id: 'a', date: '2026-02-01' }), tx({ id: 'b', date: '2026-02-01' })],
      RANGE,
    );
    expect(groupByDate(occs)['2026-02-01']).toHaveLength(2);
  });
});
