import { describe, expect, it } from 'vitest';
import { formatBRL, formatCompactBRL, formatSignedBRL, parseAmount, round2, splitInstallments } from '../money';

// O Intl usa espaço não separável entre "R$" e o número.
const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('formatBRL', () => {
  it('formata em pt-BR com centavos', () => {
    expect(nbsp(formatBRL(1234.5))).toBe('R$ 1.234,50');
  });

  it('esconde os centavos quando pedido', () => {
    expect(nbsp(formatBRL(1234.5, { cents: false }))).toBe('R$ 1.235');
  });

  it('prefixa o sinal em listas mistas', () => {
    expect(nbsp(formatSignedBRL(100))).toBe('+R$ 100,00');
    expect(nbsp(formatSignedBRL(-100))).toBe('-R$ 100,00');
    expect(nbsp(formatSignedBRL(0))).toBe('R$ 0,00');
  });
});

describe('formatCompactBRL', () => {
  it('encolhe mantendo ~3 dígitos significativos', () => {
    expect(nbsp(formatCompactBRL(840))).toBe('R$ 840');
    expect(nbsp(formatCompactBRL(5983))).toBe('R$ 5,98K');
    expect(nbsp(formatCompactBRL(12800))).toBe('R$ 12,8K');
    expect(nbsp(formatCompactBRL(128000))).toBe('R$ 128K');
    expect(nbsp(formatCompactBRL(1280000))).toBe('R$ 1,28M');
  });

  it('mantém o sinal antes do símbolo', () => {
    expect(nbsp(formatCompactBRL(-5983))).toBe('-R$ 5,98K');
  });
});

describe('parseAmount', () => {
  it('aceita o formato pt-BR', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('R$ 1.234,56')).toBe(1234.56);
  });

  it('aceita o formato do input numérico', () => {
    expect(parseAmount('1234.56')).toBe(1234.56);
  });

  it('devolve null para entrada vazia ou inválida', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('splitInstallments', () => {
  it('divide um total que não fecha redondo sem perder centavos', () => {
    const parts = splitInstallments(100, 3);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
    expect(round2(parts.reduce((a, b) => a + b, 0))).toBe(100);
  });

  it('divide exato quando fecha redondo', () => {
    expect(splitInstallments(1200, 4)).toEqual([300, 300, 300, 300]);
  });

  it('devolve lista vazia para contagem inválida', () => {
    expect(splitInstallments(100, 0)).toEqual([]);
  });
});
