import type { BudgetConfig, Occurrence, Tag } from '../types';
import { round2 } from './money';
import type { DayProjection } from './projection';

/**
 * Soma o orçamento mensal das categorias.
 *
 * A fonte é a lista de categorias (`Tag.monthlyBudget`) — e só ela. Receita
 * menos despesas fixas é outro número, que responde "quanto sobra da minha
 * renda", não "quanto planejo gastar por dia".
 */
export function monthlyBudgetTotal(categories: Tag[]): number {
  return round2(categories.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0));
}

/** Categorias que de fato entram na previsão — as que têm orçamento definido. */
export function budgetedCategories(categories: Tag[]): Tag[] {
  return categories.filter((c) => (c.monthlyBudget ?? 0) > 0);
}

/**
 * Gasto diário sugerido: total mensal planejado ÷ divisor de dias.
 *
 * O divisor é configurável (o padrão é 30) em vez de usar os dias do mês
 * corrente, para que a meta não oscile de fevereiro para março.
 */
export function dailyBudgetFrom(categories: Tag[], config: BudgetConfig): number {
  const divisor = config.daysDivisor > 0 ? config.daysDivisor : 30;
  return round2(monthlyBudgetTotal(categories) / divisor);
}

export interface MonthMetrics {
  entradas: number;
  saidas: number;
  diarios: number;
  economias: number;
  cartao: number;
  /** Soma da previsão de diário dos dias que ainda não aconteceram no mês. */
  diarioPrevistoRestante: number;
  diasRestantes: number;
  diasNoMes: number;
  /** Sobrou (positivo) ou faltou (negativo) dinheiro no mês. */
  performance: number;
  /** economias ÷ entradas (0 quando não houve entrada). */
  savingsRate: number;
  /** saídas + diários + cartão + previsão restante. */
  custoDeVida: number;
  /** custo de vida ÷ entradas — acima de 1 significa gastar mais do que ganha. */
  custoDeVidaSobreRenda: number;
  /** Total de diários ÷ dias do mês. */
  diarioMedio: number;
  saldoInicial: number;
  saldoFinal: number;
}

/**
 * Métricas do mês a partir dos dias já projetados.
 *
 * Recebe `DayProjection[]` em vez das ocorrências cruas de propósito: a
 * previsão de diário por dia já foi resolvida pela projeção, então os cards de
 * Totais nunca discordam do calendário.
 */
export function monthMetrics(days: DayProjection[]): MonthMetrics {
  const acc = {
    entradas: 0, saidas: 0, diarios: 0, economias: 0, cartao: 0,
    diarioPrevistoRestante: 0, diasRestantes: 0,
  };

  for (const day of days) {
    acc.entradas += day.entradas;
    acc.saidas += day.saidas;
    acc.diarios += day.diarios;
    acc.economias += day.economias;
    acc.cartao += day.cartao;
    acc.diarioPrevistoRestante += day.diarioPrevisto;
    if (day.isFuture) acc.diasRestantes += 1;
  }

  const diasNoMes = days.length;
  const performance = round2(
    acc.entradas - acc.saidas - acc.diarios - acc.economias - acc.cartao - acc.diarioPrevistoRestante,
  );
  const custoDeVida = round2(acc.saidas + acc.diarios + acc.cartao + acc.diarioPrevistoRestante);

  return {
    entradas: round2(acc.entradas),
    saidas: round2(acc.saidas),
    diarios: round2(acc.diarios),
    economias: round2(acc.economias),
    cartao: round2(acc.cartao),
    diarioPrevistoRestante: round2(acc.diarioPrevistoRestante),
    diasRestantes: acc.diasRestantes,
    diasNoMes,
    performance,
    savingsRate: acc.entradas > 0 ? acc.economias / acc.entradas : 0,
    custoDeVida,
    custoDeVidaSobreRenda: acc.entradas > 0 ? custoDeVida / acc.entradas : 0,
    diarioMedio: diasNoMes > 0 ? round2(acc.diarios / diasNoMes) : 0,
    saldoInicial: days.length > 0 ? round2(days[0].balance - days[0].net) : 0,
    saldoFinal: days.length > 0 ? days[days.length - 1].balance : 0,
  };
}

/** Meta de economia considerada saudável — referência visual, não trava nada. */
export const HEALTHY_SAVINGS_RATE = 0.2;

export interface TagTotal {
  tagId: string;
  total: number;
  count: number;
  share: number;
}

/**
 * Total gasto por tag num conjunto de ocorrências. Entradas ficam de fora:
 * a tela de Tags responde "para onde foi o dinheiro".
 */
export function tagTotals(occurrences: Occurrence[]): TagTotal[] {
  const totals = new Map<string, { total: number; count: number }>();

  for (const occ of occurrences) {
    if (occ.type === 'entrada') continue;
    const ids = occ.tagIds.length > 0 ? occ.tagIds : ['__sem_tag__'];
    // Uma movimentação com N tags soma o valor cheio em cada uma — as somas por
    // tag não fecham com o total do mês, e é assim que o app de referência faz.
    for (const tagId of ids) {
      const current = totals.get(tagId) ?? { total: 0, count: 0 };
      current.total += occ.value;
      current.count += 1;
      totals.set(tagId, current);
    }
  }

  const grandTotal = [...totals.values()].reduce((sum, t) => sum + t.total, 0);

  return [...totals.entries()]
    .map(([tagId, t]) => ({
      tagId,
      total: round2(t.total),
      count: t.count,
      share: grandTotal > 0 ? t.total / grandTotal : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export const NO_TAG_ID = '__sem_tag__';
