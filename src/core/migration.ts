import type {
  BudgetConfig,
  PlanningConfig,
  RealSpends,
  Transaction,
} from '../types';
import { round2 } from './money';
import { normalizeTagIds, normalizeType } from './recurrence';

/**
 * Versão do formato dos dados no Firestore.
 *
 * 1 — 4 tipos (`fatura` em vez de `cartao`), tag única em `tagId`, gasto do dia
 *     como número solto em `settings.realSpends`.
 * 2 — 5 tipos, tags N:N em `tagIds`, cartões cadastrados, recorrência e
 *     parcelamento, orçamento diário por categorias.
 */
export const SCHEMA_VERSION = 2;

/**
 * Traz uma movimentação salva no formato antigo para o modelo atual.
 *
 * Lançamentos `fatura` viram `cartao` sem cartão vinculado: a `date` deles já
 * era o vencimento da fatura, então o saldo não muda — o usuário só passa a
 * poder associá-los a um cartão cadastrado depois.
 */
export function normalizeTransaction(tx: Transaction): Transaction {
  const tagIds = normalizeTagIds(tx);
  const normalized: Transaction = {
    ...tx,
    type: normalizeType(tx.type),
    recurrence: tx.recurrence ?? 'nenhuma',
  };

  if (tagIds.length > 0) normalized.tagIds = tagIds;
  delete normalized.tagId;

  return normalized;
}

export function needsTransactionMigration(tx: Transaction): boolean {
  return tx.type === 'fatura' || (tx.tagId !== undefined && tx.tagId !== null);
}

/**
 * Converte o mapa `realSpends` em movimentações do tipo `diario`.
 *
 * Dias com R$ 0 não viram lançamento: "não gastei nada" e "não anotei" produzem
 * o mesmo saldo, e criar centenas de documentos zerados só polui o histórico.
 * Os ids são derivados da data, então rodar a migração duas vezes sobrescreve
 * os mesmos documentos em vez de duplicá-los.
 */
export function realSpendsToTransactions(realSpends: RealSpends): Transaction[] {
  return Object.entries(realSpends ?? {})
    .filter(([, value]) => typeof value === 'number' && value > 0)
    .map(([date, value]) => ({
      id: `diario-${date}`,
      type: 'diario' as const,
      value: round2(value),
      description: 'Gasto do dia',
      date,
      recurrence: 'nenhuma' as const,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const MIGRATED_BUDGET_CATEGORY_ID = 'budget-gasto-diario';

/**
 * Deriva o orçamento por categorias a partir do planejamento antigo.
 *
 * O modelo antigo calculava `(receita fixa − despesas fixas) ÷ dias do mês`. O
 * novo soma categorias de gasto e divide por um divisor configurável. Para não
 * mudar o número que o usuário já conhece, o valor que sobrava vira uma única
 * categoria — ele pode quebrá-la em Alimentação, Transporte etc. depois.
 *
 * As despesas fixas continuam salvas em `planningConfig`: elas não são gasto do
 * dia a dia, e transformá-las em lançamentos recorrentes muda todos os saldos
 * do calendário — isso fica como ação explícita na tela de Planejamento.
 */
export function planningConfigToBudget(planning: PlanningConfig | undefined): BudgetConfig {
  const fixedRevenue = planning?.fixedRevenue ?? 0;
  const fixedExpenses = (planning?.fixedExpenses ?? []).reduce((sum, e) => sum + (e.value || 0), 0);
  const remaining = Math.max(0, round2(fixedRevenue - fixedExpenses));

  return {
    categories: remaining > 0
      ? [{ id: MIGRATED_BUDGET_CATEGORY_ID, name: 'Gasto do dia a dia', monthlyValue: remaining, icon: 'shopping' }]
      : [],
    daysDivisor: 30,
  };
}

export interface MigrationPlan {
  /** Movimentações existentes que precisam ser regravadas no formato novo. */
  transactionsToUpdate: Transaction[];
  /** Movimentações `diario` criadas a partir de `realSpends`. */
  transactionsToCreate: Transaction[];
  budgetConfig: BudgetConfig;
  schemaVersion: number;
  /** true quando não há nada a fazer — evita escrita desnecessária no Firestore. */
  isNoop: boolean;
}

/**
 * Monta o plano de migração sem tocar no banco, para que o chamador decida
 * quando escrever e o resultado possa ser testado.
 */
export function planMigration(args: {
  transactions: Transaction[];
  realSpends?: RealSpends;
  planningConfig?: PlanningConfig;
  existingBudget?: BudgetConfig;
  currentSchemaVersion?: number;
}): MigrationPlan {
  const { transactions, realSpends, planningConfig, existingBudget, currentSchemaVersion = 1 } = args;

  if (currentSchemaVersion >= SCHEMA_VERSION) {
    return {
      transactionsToUpdate: [],
      transactionsToCreate: [],
      budgetConfig: existingBudget ?? { categories: [], daysDivisor: 30 },
      schemaVersion: currentSchemaVersion,
      isNoop: true,
    };
  }

  const transactionsToUpdate = transactions.filter(needsTransactionMigration).map(normalizeTransaction);

  // Não recria um `diario` para uma data que já tem lançamento desse tipo.
  const existingDiarioDates = new Set(
    transactions.filter((t) => t.type === 'diario').map((t) => t.date),
  );
  const transactionsToCreate = realSpendsToTransactions(realSpends ?? {})
    .filter((t) => !existingDiarioDates.has(t.date));

  const budgetConfig = existingBudget && existingBudget.categories.length > 0
    ? existingBudget
    : planningConfigToBudget(planningConfig);

  return {
    transactionsToUpdate,
    transactionsToCreate,
    budgetConfig,
    schemaVersion: SCHEMA_VERSION,
    isNoop: false,
  };
}
