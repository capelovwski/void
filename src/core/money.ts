/** Formatação monetária em R$, com variante compacta para as visões densas. */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL_ROUND = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatBRL(value: number, opts: { cents?: boolean } = {}): string {
  const cents = opts.cents ?? true;
  return (cents ? BRL : BRL_ROUND).format(value);
}

/**
 * Versão curta para células apertadas (Horizonte, badges de dia): mantém ~3
 * dígitos significativos e encolhe a unidade — R$ 840, R$ 5,98K, R$ 128K, R$ 1,28M.
 */
export function formatCompactBRL(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  const scale = (n: number, decimals: number, suffix: string) =>
    `${sign}R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  if (abs < 1_000) return scale(Math.round(abs), 0, '');
  if (abs < 10_000) return scale(abs / 1_000, 2, 'K');
  if (abs < 100_000) return scale(abs / 1_000, 1, 'K');
  if (abs < 1_000_000) return scale(abs / 1_000, 0, 'K');
  if (abs < 10_000_000) return scale(abs / 1_000_000, 2, 'M');
  return scale(abs / 1_000_000, 1, 'M');
}

/** Prefixa o sinal explicitamente — usado em listas onde entrada e saída convivem. */
export function formatSignedBRL(value: number, opts: { cents?: boolean } = {}): string {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${prefix}${formatBRL(Math.abs(value), opts)}`;
}

/**
 * Lê o que o usuário digitou. Aceita "1.234,56" (pt-BR), "1234.56" (input
 * numérico) e "R$ 1.234". Devolve null quando não há número válido.
 */
export function parseAmount(input: string): number | null {
  const raw = input.trim().replace(/[R$\s]/g, '');
  if (!raw) return null;

  // Se tem vírgula, ela é o separador decimal e os pontos são de milhar.
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Arredonda para centavos, evitando o lixo de ponto flutuante em somas. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Divide um total em N parcelas que somam exatamente o total: as parcelas são
 * arredondadas para baixo e a diferença de centavos vai para a primeira.
 */
export function splitInstallments(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor((total * 100) / count) / 100;
  const parts = Array.from({ length: count }, () => base);
  parts[0] = round2(base + (total - base * count));
  return parts;
}
