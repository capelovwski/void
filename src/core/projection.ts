import type { Occurrence } from '../types';
import { type YMD, eachDayYMD } from './dates';
import { round2 } from './money';

export interface DayProjection {
  date: YMD;
  entradas: number;
  saidas: number;
  diarios: number;
  economias: number;
  /** Faturas de cartão que vencem neste dia. */
  cartao: number;
  /** Gasto diário estimado somado apenas em dias futuros. */
  diarioPrevisto: number;
  /** Variação líquida do dia (entradas − todas as saídas, incluindo a previsão). */
  net: number;
  /** Saldo acumulado ao final do dia. */
  balance: number;
  occurrences: Occurrence[];
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface ProjectionInput {
  occurrences: Occurrence[];
  /** Saldo no dia anterior a `start`. */
  initialBalance: number;
  start: YMD;
  end: YMD;
  today: YMD;
  /**
   * Orçamento diário sugerido. Só é aplicado a dias futuros e só na parte que
   * ainda não foi lançada como `diario` — um dia futuro com R$ 200 já lançados
   * não leva mais o orçamento por cima. 0 desliga a previsão.
   */
  dailyBudget?: number;
}

export interface Projection {
  days: DayProjection[];
  byDate: Record<YMD, DayProjection>;
  finalBalance: number;
  /** Primeiro dia do horizonte em que o saldo fecha negativo. É o alerta principal do app. */
  firstNegativeDate: YMD | null;
  lowestBalance: { date: YMD; balance: number } | null;
}

const EMPTY_TOTALS = { entradas: 0, saidas: 0, diarios: 0, economias: 0, cartao: 0 };

/**
 * Coração do app: devolve o saldo dia a dia.
 *
 * Regra, por dia:
 *   saldo = saldo do dia anterior
 *         + entradas
 *         − saídas − diários − economias
 *         − faturas de cartão que vencem hoje
 *         − previsão de gasto diário (apenas em dias futuros)
 *
 * Compras no cartão não aparecem na data da compra: a expansão já as colocou
 * na data de vencimento da fatura (ver core/cards.ts), então aqui elas são
 * simplesmente ocorrências do dia do vencimento.
 *
 * Função pura: mesma entrada, mesma saída. Alimenta Saldos, Horizonte e Totais.
 */
export function projectBalances(input: ProjectionInput): Projection {
  const { occurrences, initialBalance, start, end, today, dailyBudget = 0 } = input;

  const grouped: Record<YMD, Occurrence[]> = {};
  for (const occ of occurrences) {
    if (occ.date < start || occ.date > end) continue;
    (grouped[occ.date] ??= []).push(occ);
  }

  const days: DayProjection[] = [];
  const byDate: Record<YMD, DayProjection> = {};
  let running = initialBalance;
  let firstNegativeDate: YMD | null = null;
  let lowestBalance: { date: YMD; balance: number } | null = null;

  for (const date of eachDayYMD(start, end)) {
    const dayOccurrences = grouped[date] ?? [];
    const totals = { ...EMPTY_TOTALS };

    for (const occ of dayOccurrences) {
      switch (occ.type) {
        case 'entrada': totals.entradas += occ.value; break;
        case 'saida': totals.saidas += occ.value; break;
        case 'diario': totals.diarios += occ.value; break;
        case 'economia': totals.economias += occ.value; break;
        case 'cartao': totals.cartao += occ.value; break;
      }
    }

    const isToday = date === today;
    const isPast = date < today;
    const isFuture = date > today;

    // No passado e hoje vale o que de fato foi lançado; a previsão só existe
    // para dias que ainda não aconteceram.
    const diarioPrevisto = isFuture ? Math.max(0, dailyBudget - totals.diarios) : 0;

    const net = round2(
      totals.entradas - totals.saidas - totals.diarios - totals.economias - totals.cartao - diarioPrevisto,
    );
    running = round2(running + net);

    const day: DayProjection = {
      date,
      entradas: round2(totals.entradas),
      saidas: round2(totals.saidas),
      diarios: round2(totals.diarios),
      economias: round2(totals.economias),
      cartao: round2(totals.cartao),
      diarioPrevisto: round2(diarioPrevisto),
      net,
      balance: running,
      occurrences: dayOccurrences,
      isPast,
      isToday,
      isFuture,
    };

    days.push(day);
    byDate[date] = day;

    if (firstNegativeDate === null && running < 0) firstNegativeDate = date;
    if (lowestBalance === null || running < lowestBalance.balance) {
      lowestBalance = { date, balance: running };
    }
  }

  return {
    days,
    byDate,
    finalBalance: running,
    firstNegativeDate,
    lowestBalance,
  };
}

/** Faixas do mapa de calor. A ordem importa: o primeiro match vence. */
export type BalanceLevel = 'high' | 'ok' | 'warn' | 'crit' | 'neg';

export function balanceLevel(balance: number, thresholds = { high: 5000, ok: 300, warn: 100 }): BalanceLevel {
  if (balance < 0) return 'neg';
  if (balance >= thresholds.high) return 'high';
  if (balance >= thresholds.ok) return 'ok';
  if (balance >= thresholds.warn) return 'warn';
  return 'crit';
}
