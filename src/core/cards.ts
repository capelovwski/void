import type { Card } from '../types';
import { type YMD, dayOf, monthIndexOf, yearOf, ymdOf } from './dates';

/**
 * Data em que fecha a fatura que recebe uma compra.
 *
 * Convenção adotada: compras feitas A PARTIR do dia de fechamento já entram na
 * próxima fatura — é como Nubank e Itaú se comportam. Uma compra no dia 3 num
 * cartão que fecha dia 3 cai na fatura seguinte. Para inverter isso, troque o
 * `<` por `<=` abaixo (e ajuste os testes em __tests__/cards.test.ts).
 */
export function invoiceClosingDate(purchaseDate: YMD, card: Pick<Card, 'closingDay'>): YMD {
  const monthOffset = dayOf(purchaseDate) < card.closingDay ? 0 : 1;
  return ymdOf(yearOf(purchaseDate), monthIndexOf(purchaseDate) + monthOffset, card.closingDay);
}

/**
 * Data em que a compra sai do saldo: o vencimento da fatura em que ela caiu.
 *
 * O vencimento é o primeiro `dueDay` em ou após o fechamento. Quando o dia de
 * vencimento é menor ou igual ao de fechamento (ex.: fecha dia 28, vence dia 5),
 * ele necessariamente cai no mês seguinte ao fechamento.
 */
export function invoiceDueDate(purchaseDate: YMD, card: Pick<Card, 'closingDay' | 'dueDay'>): YMD {
  const closing = invoiceClosingDate(purchaseDate, card);
  const monthOffset = card.dueDay > card.closingDay ? 0 : 1;
  return ymdOf(yearOf(closing), monthIndexOf(closing) + monthOffset, card.dueDay);
}

/**
 * Janela de compras que compõem a fatura com o vencimento informado.
 *
 * O intervalo é semiaberto — `opensAt <= compra < closesAt` — porque uma compra
 * feita no dia do fechamento já pertence à fatura seguinte.
 */
export function invoicePeriod(
  dueDate: YMD,
  card: Pick<Card, 'closingDay' | 'dueDay'>,
): { opensAt: YMD; closesAt: YMD } {
  const closingMonthOffset = card.dueDay > card.closingDay ? 0 : -1;
  const closesAt = ymdOf(yearOf(dueDate), monthIndexOf(dueDate) + closingMonthOffset, card.closingDay);
  const opensAt = ymdOf(yearOf(closesAt), monthIndexOf(closesAt) - 1, card.closingDay);
  return { opensAt, closesAt };
}

export function findCard(cards: Card[], cardId?: string): Card | undefined {
  return cardId ? cards.find((c) => c.id === cardId) : undefined;
}

/** Clampa os dias informados pelo usuário na faixa válida de 1 a 31. */
export function normalizeCard(card: Card): Card {
  const clamp = (n: number) => Math.min(31, Math.max(1, Math.round(n) || 1));
  return { ...card, closingDay: clamp(card.closingDay), dueDay: clamp(card.dueDay) };
}
