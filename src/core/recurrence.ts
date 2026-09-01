import type { Occurrence, Transaction, TransactionType } from '../types';
import {
  type YMD,
  addDaysYMD,
  addMonthsYMD,
  daysBetweenYMD,
  monthsBetweenYMD,
} from './dates';
import { splitInstallments } from './money';

export interface ExpandRange {
  start: YMD;
  end: YMD;
}

/**
 * Trava de segurança: uma recorrência diária aberta num horizonte de 12 meses
 * gera ~365 ocorrências. O teto existe para que dados corrompidos (data
 * absurda no passado, por exemplo) não travem a renderização.
 */
const MAX_OCCURRENCES_PER_TRANSACTION = 800;

/** `fatura` é o tipo antigo de lançamento de cartão. */
export function normalizeType(type: Transaction['type']): TransactionType {
  return type === 'fatura' ? 'cartao' : type;
}

export function normalizeTagIds(tx: Pick<Transaction, 'tagIds' | 'tagId'>): string[] {
  if (tx.tagIds && tx.tagIds.length > 0) return tx.tagIds;
  return tx.tagId ? [tx.tagId] : [];
}

function makeOccurrence(
  tx: Transaction,
  date: YMD,
  value: number,
  virtual: boolean,
  installment?: { index: number; count: number },
): Occurrence {
  return {
    key: virtual ? `${tx.id}@${date}` : tx.id,
    transactionId: tx.id,
    type: normalizeType(tx.type),
    value,
    description: tx.description,
    date,
    purchaseDate: tx.purchaseDate,
    cardId: tx.cardId,
    tagIds: normalizeTagIds(tx),
    installmentIndex: installment?.index,
    installmentCount: installment?.count,
    virtual,
  };
}

/**
 * Datas em que uma série cai, já recortadas pelo intervalo pedido.
 *
 * O cursor sempre é calculado a partir da âncora (`addMonthsYMD(anchor, k)`),
 * nunca somando um mês por vez ao cursor anterior: um lançamento no dia 31
 * passaria a cair no dia 28 para sempre depois de fevereiro.
 */
function seriesDates(anchor: YMD, recurrence: Transaction['recurrence'], range: ExpandRange, hardEnd: YMD): YMD[] {
  const dates: YMD[] = [];
  const limit = hardEnd < range.end ? hardEnd : range.end;

  if (recurrence === 'diaria') {
    let cursor = anchor > range.start ? anchor : range.start;
    while (cursor <= limit && dates.length < MAX_OCCURRENCES_PER_TRANSACTION) {
      dates.push(cursor);
      cursor = addDaysYMD(cursor, 1);
    }
    return dates;
  }

  if (recurrence === 'semanal') {
    const gap = daysBetweenYMD(anchor, range.start);
    let step = gap > 0 ? Math.ceil(gap / 7) : 0;
    let cursor = addDaysYMD(anchor, step * 7);
    while (cursor <= limit && dates.length < MAX_OCCURRENCES_PER_TRANSACTION) {
      if (cursor >= anchor) dates.push(cursor);
      cursor = addDaysYMD(anchor, ++step * 7);
    }
    return dates;
  }

  // mensal
  let step = Math.max(0, monthsBetweenYMD(anchor, range.start));
  let cursor = addMonthsYMD(anchor, step);
  if (cursor < range.start) cursor = addMonthsYMD(anchor, ++step);
  while (cursor <= limit && dates.length < MAX_OCCURRENCES_PER_TRANSACTION) {
    if (cursor >= anchor) dates.push(cursor);
    cursor = addMonthsYMD(anchor, ++step);
  }
  return dates;
}

/**
 * Transforma as movimentações salvas nas ocorrências concretas do intervalo.
 *
 * Recorrências e parcelamentos NÃO são materializados no banco: guardamos uma
 * movimentação com a regra e expandimos aqui, na leitura. Isso evita escrever
 * centenas de documentos por lançamento e mantém a edição da série num lugar só.
 * Ocorrências individuais podem ser removidas via `skipDates`.
 */
export function expandTransactions(transactions: Transaction[], range: ExpandRange): Occurrence[] {
  const out: Occurrence[] = [];

  for (const tx of transactions) {
    const recurrence = tx.recurrence ?? 'nenhuma';
    const skip = new Set(tx.skipDates ?? []);
    const anchor = tx.date;

    if (recurrence === 'nenhuma') {
      if (anchor >= range.start && anchor <= range.end && !skip.has(anchor)) {
        out.push(makeOccurrence(tx, anchor, tx.value, false));
      }
      continue;
    }

    if (recurrence === 'parcelado') {
      const count = Math.max(1, Math.round(tx.installmentCount ?? 1));

      // Com o total original gravado, cada parcela sai da divisão exata dele e a
      // soma fecha com o total — sem os centavos que se perdem em `total / N`.
      const values = tx.installmentTotal != null
        ? splitInstallments(tx.installmentTotal, count)
        : Array.from({ length: count }, () => tx.value);

      for (let i = 0; i < count; i++) {
        const date = addMonthsYMD(anchor, i);
        if (date > range.end) break;
        if (date < range.start || skip.has(date)) continue;
        out.push(makeOccurrence(tx, date, values[i], i > 0, { index: i + 1, count }));
      }
      continue;
    }

    const hardEnd = tx.recurrenceEnd ?? range.end;
    for (const date of seriesDates(anchor, recurrence, range, hardEnd)) {
      if (skip.has(date)) continue;
      out.push(makeOccurrence(tx, date, tx.value, date !== anchor));
    }
  }

  return out.sort((a, b) => (a.date === b.date ? a.key.localeCompare(b.key) : a.date.localeCompare(b.date)));
}

/** Agrupa ocorrências por data — a forma que Saldos, Horizonte e o painel do dia consomem. */
export function groupByDate(occurrences: Occurrence[]): Record<YMD, Occurrence[]> {
  const map: Record<YMD, Occurrence[]> = {};
  for (const occ of occurrences) {
    (map[occ.date] ??= []).push(occ);
  }
  return map;
}
