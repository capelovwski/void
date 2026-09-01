import type { YMD } from './core/dates';

/**
 * Os 5 tipos de movimentação. Cada um tem comportamento próprio no cálculo
 * do saldo (ver src/core/projection.ts):
 *
 *  entrada  — soma no saldo na data lançada
 *  saida    — subtrai no saldo na data lançada
 *  diario   — gasto pequeno do dia a dia, comparado ao orçamento diário
 *  economia — subtrai do disponível, mas conta como poupança nas métricas
 *  cartao   — não afeta o saldo na data da compra, só no vencimento da fatura
 */
export type TransactionType = 'entrada' | 'saida' | 'diario' | 'economia' | 'cartao';

export const TRANSACTION_TYPES: TransactionType[] = ['entrada', 'saida', 'diario', 'economia', 'cartao'];

/** `fatura` era o tipo antigo de lançamento de cartão, antes de existirem cartões cadastrados. */
export type LegacyTransactionType = 'fatura';

export type Recurrence = 'nenhuma' | 'diaria' | 'semanal' | 'mensal' | 'parcelado';

export interface Card {
  id: string;
  name: string;
  /** Dia do mês (1–31) em que a fatura fecha. */
  closingDay: number;
  /** Dia do mês (1–31) em que a fatura vence — é quando o valor sai do saldo. */
  dueDay: number;
  color?: string;
}

/**
 * Categoria única do app: serve tanto para etiquetar movimentações quanto para
 * planejar o gasto mensal. Antes eram dois modelos com nomes iguais — `Tag` e
 * `BudgetCategory` — e o usuário precisava cadastrar "Alimentação" duas vezes.
 */
export interface Tag {
  id: string;
  name: string;
  color: string; // hex
  icon?: string; // chave em CATEGORY_ICONS

  /**
   * Quanto se espera gastar por mês nesta categoria. Ausente ou 0 significa
   * que ela não entra na previsão de diário — é só uma etiqueta.
   */
  monthlyBudget?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType | LegacyTransactionType;
  value: number;
  description: string;

  /**
   * Data em que o dinheiro se move no saldo. Para `cartao` é o vencimento da
   * fatura (derivado de `purchaseDate` + cartão, mas editável); para os demais
   * tipos é a própria data do lançamento.
   */
  date: YMD;

  /** Só em `cartao`: quando a compra foi feita, que é o que define a fatura. */
  purchaseDate?: YMD;
  cardId?: string;

  /** Tags N:N. `tagId` é o campo legado de tag única, lido na migração. */
  tagIds?: string[];
  tagId?: string;

  recurrence?: Recurrence;
  /** Data limite da recorrência; sem ela a série é aberta e segue até o fim do horizonte. */
  recurrenceEnd?: YMD;

  /** Só em `parcelado`: total de parcelas. O `value` guarda o valor da parcela. */
  installmentCount?: number;
  /** Valor total original do parcelamento, para exibir "parcela X de N de R$ Y". */
  installmentTotal?: number;

  /** Aponta para a movimentação que originou esta, quando destacada de uma série. */
  parentId?: string;
  /** Datas da série que foram apagadas individualmente. */
  skipDates?: YMD[];
}

/** Uma ocorrência concreta em uma data — o que a projeção realmente consome. */
export interface Occurrence {
  /** Estável e determinístico: `${transactionId}` ou `${transactionId}@${date}` numa série. */
  key: string;
  transactionId: string;
  type: TransactionType;
  value: number;
  description: string;
  date: YMD;
  purchaseDate?: YMD;
  cardId?: string;
  tagIds: string[];
  /** 1-based. Presente apenas em parcelamentos. */
  installmentIndex?: number;
  installmentCount?: number;
  /** true quando veio da expansão de uma recorrência/parcelamento, não de um doc próprio. */
  virtual: boolean;
}

export interface BudgetConfig {
  /** Divisor de dias para o gasto diário sugerido (o app de referência usa 30). */
  daysDivisor: number;

  /**
   * Lista antiga de categorias de orçamento, hoje fundida em `Tag.monthlyBudget`.
   * Mantida só para a migração do schema 2 conseguir ler o que já foi gravado.
   */
  categories?: BudgetCategory[];
}

/** @deprecated Fundida em `Tag`. Só existe para ler dados do schema 2. */
export interface BudgetCategory {
  id: string;
  name: string;
  monthlyValue: number;
  color?: string;
  icon?: string;
}

export interface Bank {
  id: string;
  name: string;
  color: string;
  balance: number;
}

export interface Note {
  id: string;
  text: string;
  createdAt: number;
  userId: string;
}

/* ------------------------------------------------------------------------ *
 * Modelo legado — mantido para ler dados já gravados no Firestore.
 * A conversão para o modelo acima vive em src/core/migration.ts.
 * ------------------------------------------------------------------------ */

export interface FixedExpense {
  id: string;
  name: string;
  value: number;
}

export interface PlanningConfig {
  fixedRevenue: number;
  fixedExpenses: FixedExpense[];
}

/** 'YYYY-MM-DD' -> gasto real do dia. Substituído por movimentações do tipo `diario`. */
export type RealSpends = Record<string, number>;
