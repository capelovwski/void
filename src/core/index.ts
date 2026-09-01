import type { Occurrence, Transaction } from '../types';
import type { YMD } from './dates';
import { expandTransactions } from './recurrence';
import { projectBalances, type Projection } from './projection';

export * from './dates';
export * from './money';
export * from './cards';
export * from './recurrence';
export * from './projection';
export * from './budget';
export * from './migration';

export interface BuildProjectionArgs {
  transactions: Transaction[];
  initialBalance: number;
  start: YMD;
  end: YMD;
  today: YMD;
  dailyBudget?: number;
}

/**
 * Caminho completo do dado bruto até o saldo diário: expande recorrências e
 * parcelamentos no intervalo pedido e projeta o saldo em cima delas.
 *
 * Devolve também as ocorrências porque as telas de Tags e Totais trabalham
 * sobre elas, e reexpandir custaria o dobro.
 */
export function buildProjection(args: BuildProjectionArgs): {
  projection: Projection;
  occurrences: Occurrence[];
} {
  const { transactions, initialBalance, start, end, today, dailyBudget = 0 } = args;
  const occurrences = expandTransactions(transactions, { start, end });
  const projection = projectBalances({ occurrences, initialBalance, start, end, today, dailyBudget });
  return { projection, occurrences };
}
