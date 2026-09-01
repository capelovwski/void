/**
 * Datas do app vivem como string 'YYYY-MM-DD' interpretada em horário local.
 *
 * O padrão anterior — `new Date().toISOString().split('T')[0]` — devolve a data
 * em UTC: no Brasil (UTC-3) ele já responde "amanhã" a partir das 21h. Todas as
 * conversões aqui passam pelos getters locais do Date para evitar isso.
 */

export type YMD = string; // 'YYYY-MM-DD'

const pad = (n: number): string => String(n).padStart(2, '0');

export function toYMD(date: Date): YMD {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Meio-dia local: evita que uma virada de horário de verão empurre a data em um dia. */
export function fromYMD(ymd: YMD): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayYMD(now: Date = new Date()): YMD {
  return toYMD(now);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Monta 'YYYY-MM-DD' aceitando monthIndex fora de 0–11 (normaliza o ano) e
 * grudando o dia no último do mês quando ele não existe: dia 31 em fevereiro
 * vira 28 ou 29. É o que faz "vence todo dia 31" se comportar em fevereiro.
 */
export function ymdOf(year: number, monthIndex: number, day: number): YMD {
  const y = year + Math.floor(monthIndex / 12);
  const m = ((monthIndex % 12) + 12) % 12;
  const d = Math.min(Math.max(day, 1), daysInMonth(y, m));
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function yearOf(ymd: YMD): number { return Number(ymd.slice(0, 4)); }
export function monthIndexOf(ymd: YMD): number { return Number(ymd.slice(5, 7)) - 1; }
export function dayOf(ymd: YMD): number { return Number(ymd.slice(8, 10)); }

/** 'YYYY-MM' — chave estável para agrupar por mês. */
export function monthKeyOf(ymd: YMD): string { return ymd.slice(0, 7); }

export function addDaysYMD(ymd: YMD, days: number): YMD {
  const d = fromYMD(ymd);
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

/** Soma meses preservando o dia quando ele existe: 31/jan + 1 mês = 28/fev, não 03/mar. */
export function addMonthsYMD(ymd: YMD, months: number): YMD {
  return ymdOf(yearOf(ymd), monthIndexOf(ymd) + months, dayOf(ymd));
}

export function startOfMonthYMD(ymd: YMD): YMD {
  return ymdOf(yearOf(ymd), monthIndexOf(ymd), 1);
}

export function endOfMonthYMD(ymd: YMD): YMD {
  return ymdOf(yearOf(ymd), monthIndexOf(ymd), 31);
}

/** Lista inclusiva de datas entre start e end. Devolve [] se start > end. */
export function eachDayYMD(start: YMD, end: YMD): YMD[] {
  const out: YMD[] = [];
  let cursor = start;
  while (cursor <= end) {
    out.push(cursor);
    cursor = addDaysYMD(cursor, 1);
  }
  return out;
}

/** Meses cobertos por um intervalo, como 'YYYY-MM'. */
export function eachMonthKey(start: YMD, end: YMD): string[] {
  const out: string[] = [];
  let cursor = startOfMonthYMD(start);
  const limit = startOfMonthYMD(end);
  while (cursor <= limit) {
    out.push(monthKeyOf(cursor));
    cursor = addMonthsYMD(cursor, 1);
  }
  return out;
}

export function weekdayShort(ymd: YMD): string {
  return fromYMD(ymd).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export function monthLabel(ymd: YMD, opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }): string {
  return fromYMD(ymd).toLocaleDateString('pt-BR', opts);
}

/** Diferença em dias inteiros entre duas datas (b - a). Negativo se b < a. */
export function daysBetweenYMD(a: YMD, b: YMD): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((fromYMD(b).getTime() - fromYMD(a).getTime()) / MS_PER_DAY);
}

/** Diferença em meses de calendário (b - a), ignorando o dia. */
export function monthsBetweenYMD(a: YMD, b: YMD): number {
  return (yearOf(b) - yearOf(a)) * 12 + (monthIndexOf(b) - monthIndexOf(a));
}

export function clampYMD(ymd: YMD, min: YMD, max: YMD): YMD {
  if (ymd < min) return min;
  if (ymd > max) return max;
  return ymd;
}
