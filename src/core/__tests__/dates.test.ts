import { describe, expect, it } from 'vitest';
import {
  addDaysYMD,
  addMonthsYMD,
  daysBetweenYMD,
  eachDayYMD,
  eachMonthKey,
  endOfMonthYMD,
  fromYMD,
  monthsBetweenYMD,
  toYMD,
  todayYMD,
  ymdOf,
} from '../dates';

describe('conversão de datas', () => {
  it('usa o fuso local, não UTC', () => {
    // 23h em UTC-3 é o caso que quebrava o app: toISOString() devolveria o dia seguinte.
    const lateNight = new Date(2026, 2, 15, 23, 30, 0);
    expect(toYMD(lateNight)).toBe('2026-03-15');
  });

  it('faz o round-trip YMD -> Date -> YMD', () => {
    expect(toYMD(fromYMD('2026-02-29'))).toBe('2026-03-01'); // 2026 não é bissexto
    expect(toYMD(fromYMD('2024-02-29'))).toBe('2024-02-29');
  });

  it('todayYMD aceita um relógio injetado', () => {
    expect(todayYMD(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('ymdOf', () => {
  it('gruda o dia no último do mês quando ele não existe', () => {
    expect(ymdOf(2026, 1, 31)).toBe('2026-02-28');
    expect(ymdOf(2024, 1, 31)).toBe('2024-02-29');
  });

  it('normaliza monthIndex fora de 0-11', () => {
    expect(ymdOf(2026, 12, 5)).toBe('2027-01-05');
    expect(ymdOf(2026, -1, 5)).toBe('2025-12-05');
  });
});

describe('aritmética', () => {
  it('soma meses preservando o dia sempre que possível', () => {
    expect(addMonthsYMD('2026-01-31', 1)).toBe('2026-02-28');
    // Calculado a partir da âncora, então março volta a ser dia 31.
    expect(addMonthsYMD('2026-01-31', 2)).toBe('2026-03-31');
  });

  it('atravessa a virada de ano somando dias', () => {
    expect(addDaysYMD('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysYMD('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('mede distâncias em dias e meses', () => {
    expect(daysBetweenYMD('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetweenYMD('2026-01-31', '2026-01-01')).toBe(-30);
    expect(monthsBetweenYMD('2026-01-31', '2026-03-01')).toBe(2);
  });
});

describe('intervalos', () => {
  it('eachDayYMD é inclusivo nas duas pontas', () => {
    expect(eachDayYMD('2026-01-01', '2026-01-03')).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(eachDayYMD('2026-01-03', '2026-01-01')).toEqual([]);
    expect(eachDayYMD('2026-02-01', '2026-02-28')).toHaveLength(28);
  });

  it('eachMonthKey cobre os 12 meses do horizonte', () => {
    const keys = eachMonthKey('2026-03-15', '2027-02-28');
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe('2026-03');
    expect(keys[11]).toBe('2027-02');
  });

  it('endOfMonthYMD respeita meses curtos', () => {
    expect(endOfMonthYMD('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonthYMD('2026-04-10')).toBe('2026-04-30');
  });
});
