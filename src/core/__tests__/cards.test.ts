import { describe, expect, it } from 'vitest';
import { invoiceClosingDate, invoiceDueDate, invoicePeriod, normalizeCard } from '../cards';

// Fecha dia 28, vence dia 5 do mês seguinte — o arranjo mais comum.
const nubank = { closingDay: 28, dueDay: 5 };
// Fecha dia 3, vence dia 10 do MESMO mês.
const sameMonth = { closingDay: 3, dueDay: 10 };

describe('em qual fatura a compra cai', () => {
  it('joga a compra para o vencimento, não para a data da compra', () => {
    expect(invoiceDueDate('2026-03-10', nubank)).toBe('2026-04-05');
  });

  it('manda compras no próprio dia do fechamento para a fatura seguinte', () => {
    expect(invoiceClosingDate('2026-03-27', nubank)).toBe('2026-03-28');
    expect(invoiceClosingDate('2026-03-28', nubank)).toBe('2026-04-28');

    expect(invoiceDueDate('2026-03-27', nubank)).toBe('2026-04-05');
    expect(invoiceDueDate('2026-03-28', nubank)).toBe('2026-05-05');
  });

  it('mantém o vencimento no mês do fechamento quando o dia de vencimento é maior', () => {
    expect(invoiceDueDate('2026-03-01', sameMonth)).toBe('2026-03-10');
    expect(invoiceDueDate('2026-03-03', sameMonth)).toBe('2026-04-10');
  });

  it('empurra para o mês seguinte quando fechamento e vencimento são no mesmo dia', () => {
    expect(invoiceDueDate('2026-03-05', { closingDay: 10, dueDay: 10 })).toBe('2026-04-10');
  });

  it('gruda o fechamento no último dia de fevereiro para cartões que fecham dia 31', () => {
    expect(invoiceClosingDate('2026-02-20', { closingDay: 31 })).toBe('2026-02-28');
    expect(invoiceDueDate('2026-02-20', { closingDay: 31, dueDay: 10 })).toBe('2026-03-10');
  });

  it('atravessa a virada de ano', () => {
    expect(invoiceDueDate('2026-12-29', nubank)).toBe('2027-02-05');
  });
});

describe('invoicePeriod', () => {
  it('devolve a janela que produz aquele vencimento', () => {
    const { opensAt, closesAt } = invoicePeriod('2026-04-05', nubank);
    expect(opensAt).toBe('2026-02-28');
    expect(closesAt).toBe('2026-03-28');

    // Coerência com invoiceDueDate: tudo dentro da janela vence em 05/04.
    expect(invoiceDueDate('2026-02-28', nubank)).toBe('2026-04-05');
    expect(invoiceDueDate('2026-03-27', nubank)).toBe('2026-04-05');
    expect(invoiceDueDate(closesAt, nubank)).not.toBe('2026-04-05');
  });
});

describe('normalizeCard', () => {
  it('clampa os dias na faixa de 1 a 31', () => {
    const card = normalizeCard({ id: 'c1', name: 'X', closingDay: 0, dueDay: 99 });
    expect(card.closingDay).toBe(1);
    expect(card.dueDay).toBe(31);
  });
});
