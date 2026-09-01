import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import {
  MIGRATED_BUDGET_CATEGORY_ID,
  SCHEMA_VERSION,
  needsTransactionMigration,
  normalizeTransaction,
  planMigration,
  planningConfigToBudget,
  realSpendsToTransactions,
} from '../migration';

describe('normalização de movimentações antigas', () => {
  it('converte `fatura` em `cartao` sem mexer na data', () => {
    const legacy: Transaction = { id: 't1', type: 'fatura', value: 1200, description: 'Fatura Nubank', date: '2026-03-10' };
    const migrated = normalizeTransaction(legacy);

    expect(migrated.type).toBe('cartao');
    expect(migrated.date).toBe('2026-03-10');
    expect(migrated.cardId).toBeUndefined();
  });

  it('promove tagId para tagIds e remove o campo antigo', () => {
    const migrated = normalizeTransaction({ id: 't1', type: 'saida', value: 10, description: 'x', date: '2026-03-01', tagId: 'tag-a' });

    expect(migrated.tagIds).toEqual(['tag-a']);
    expect('tagId' in migrated).toBe(false);
  });

  it('preenche recorrência ausente com `nenhuma`', () => {
    expect(normalizeTransaction({ id: 't1', type: 'saida', value: 10, description: 'x', date: '2026-03-01' }).recurrence).toBe('nenhuma');
  });

  it('reconhece o que precisa migrar', () => {
    expect(needsTransactionMigration({ id: 't', type: 'fatura', value: 1, description: '', date: '2026-01-01' })).toBe(true);
    expect(needsTransactionMigration({ id: 't', type: 'saida', value: 1, description: '', date: '2026-01-01', tagId: 'a' })).toBe(true);
    expect(needsTransactionMigration({ id: 't', type: 'saida', value: 1, description: '', date: '2026-01-01', tagIds: ['a'] })).toBe(false);
  });
});

describe('realSpends -> movimentações diárias', () => {
  it('cria um lançamento `diario` por dia com gasto', () => {
    const created = realSpendsToTransactions({ '2026-03-01': 45, '2026-03-02': 0, '2026-03-03': 85.5 });

    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ id: 'diario-2026-03-01', type: 'diario', value: 45, date: '2026-03-01' });
    expect(created[1].value).toBe(85.5);
  });

  it('descarta dias zerados — não anotar e gastar zero dão o mesmo saldo', () => {
    expect(realSpendsToTransactions({ '2026-03-02': 0 })).toHaveLength(0);
  });

  it('usa ids derivados da data, então rodar duas vezes não duplica', () => {
    const a = realSpendsToTransactions({ '2026-03-01': 45 });
    const b = realSpendsToTransactions({ '2026-03-01': 45 });
    expect(a[0].id).toBe(b[0].id);
  });
});

describe('planejamento antigo -> orçamento por categorias', () => {
  it('preserva o que sobrava como uma única categoria', () => {
    const budget = planningConfigToBudget({
      fixedRevenue: 5500,
      fixedExpenses: [
        { id: '1', name: 'Aluguel', value: 1500 },
        { id: '2', name: 'Saúde', value: 400 },
      ],
    });

    expect(budget.daysDivisor).toBe(30);
    expect(budget.categories).toHaveLength(1);
    expect(budget.categories[0]).toMatchObject({ id: MIGRATED_BUDGET_CATEGORY_ID, monthlyValue: 3600 });
  });

  it('não cria categoria quando as despesas fixas comem a receita', () => {
    const budget = planningConfigToBudget({ fixedRevenue: 1000, fixedExpenses: [{ id: '1', name: 'Aluguel', value: 1200 }] });
    expect(budget.categories).toEqual([]);
  });

  it('aguenta planejamento ausente', () => {
    expect(planningConfigToBudget(undefined).categories).toEqual([]);
  });
});

describe('planMigration', () => {
  const legacyTransactions: Transaction[] = [
    { id: 't1', type: 'fatura', value: 1200, description: 'Fatura', date: '2026-03-10' },
    { id: 't2', type: 'saida', value: 350, description: 'Mercado', date: '2026-03-08', tagId: 'tag-a' },
    { id: 't3', type: 'entrada', value: 4500, description: 'Salário', date: '2026-03-05', tagIds: ['tag-b'] },
  ];

  it('lista só o que precisa ser regravado', () => {
    const plan = planMigration({ transactions: legacyTransactions, realSpends: { '2026-03-01': 45 } });

    expect(plan.transactionsToUpdate.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(plan.transactionsToCreate).toHaveLength(1);
    expect(plan.schemaVersion).toBe(SCHEMA_VERSION);
    expect(plan.isNoop).toBe(false);
  });

  it('não recria um diário para um dia que já tem lançamento desse tipo', () => {
    const plan = planMigration({
      transactions: [{ id: 'x', type: 'diario', value: 20, description: 'Café', date: '2026-03-01', tagIds: [] }],
      realSpends: { '2026-03-01': 45, '2026-03-02': 30 },
    });

    expect(plan.transactionsToCreate.map((t) => t.date)).toEqual(['2026-03-02']);
  });

  it('não faz nada quando o schema já está atualizado', () => {
    const plan = planMigration({
      transactions: legacyTransactions,
      realSpends: { '2026-03-01': 45 },
      currentSchemaVersion: SCHEMA_VERSION,
    });

    expect(plan.isNoop).toBe(true);
    expect(plan.transactionsToUpdate).toEqual([]);
    expect(plan.transactionsToCreate).toEqual([]);
  });

  it('preserva um orçamento já configurado em vez de derivar do planejamento antigo', () => {
    const existingBudget = { categories: [{ id: 'c', name: 'Comida', monthlyValue: 900 }], daysDivisor: 30 };
    const plan = planMigration({
      transactions: [],
      planningConfig: { fixedRevenue: 5000, fixedExpenses: [] },
      existingBudget,
    });

    expect(plan.budgetConfig).toBe(existingBudget);
  });
});
