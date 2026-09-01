import type {
  BudgetCategory,
  BudgetConfig,
  PlanningConfig,
  RealSpends,
  Tag,
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
 *     parcelamento, orçamento diário numa lista de categorias própria.
 * 3 — categoria única: `Tag.monthlyBudget` absorve `BudgetConfig.categories`,
 *     acabando com as duas listas de "categoria" que conviviam em paralelo.
 */
export const SCHEMA_VERSION = 3;

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

/** Compara nomes de categoria ignorando caixa, acento e espaços nas pontas. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export interface CategoryMergeResult {
  /** Tags existentes que ganharam um orçamento mensal. */
  tagsToUpdate: Tag[];
  /** Categorias de orçamento sem tag equivalente, que viram tags novas. */
  tagsToCreate: Tag[];
}

/**
 * Funde as categorias de orçamento do schema 2 nas tags.
 *
 * O casamento é por nome normalizado: quem tinha "Alimentação" nos dois lugares
 * termina com uma categoria só, mantendo a cor e o ícone já escolhidos na tag.
 * O que não tem par vira tag nova, preservando o valor orçado.
 */
export function mergeBudgetCategoriesIntoTags(
  tags: Tag[],
  budgetCategories: BudgetCategory[],
): CategoryMergeResult {
  const byName = new Map(tags.map((t) => [normalizeName(t.name), t]));
  const tagsToUpdate: Tag[] = [];
  const tagsToCreate: Tag[] = [];

  for (const category of budgetCategories) {
    const value = round2(category.monthlyValue || 0);
    if (value <= 0) continue;

    const existing = byName.get(normalizeName(category.name));
    if (existing) {
      // Não sobrescreve um orçamento que já tenha sido definido na própria tag.
      if ((existing.monthlyBudget ?? 0) > 0) continue;
      tagsToUpdate.push({ ...existing, monthlyBudget: value });
    } else {
      tagsToCreate.push({
        id: category.id,
        name: category.name.trim(),
        color: category.color ?? '#6B7280',
        icon: category.icon ?? 'shopping',
        monthlyBudget: value,
      });
    }
  }

  return { tagsToUpdate, tagsToCreate };
}

/**
 * Deriva a categoria de orçamento a partir do planejamento antigo (schema 1).
 *
 * O modelo antigo calculava `(receita fixa − despesas fixas) ÷ dias do mês`. O
 * novo soma o orçamento das categorias e divide por um divisor configurável.
 * Para não mudar o número que o usuário já conhece, o que sobrava vira uma
 * única categoria — que ele pode quebrar em Alimentação, Transporte etc.
 *
 * As despesas fixas continuam em `planningConfig`: elas não são gasto do dia a
 * dia, e transformá-las em lançamentos recorrentes mudaria todos os saldos do
 * calendário — isso fica como ação explícita na tela de Planejamento.
 */
export function planningConfigToCategory(planning: PlanningConfig | undefined): Tag | null {
  const fixedRevenue = planning?.fixedRevenue ?? 0;
  const fixedExpenses = (planning?.fixedExpenses ?? []).reduce((sum, e) => sum + (e.value || 0), 0);
  const remaining = Math.max(0, round2(fixedRevenue - fixedExpenses));

  if (remaining <= 0) return null;

  return {
    id: MIGRATED_BUDGET_CATEGORY_ID,
    name: 'Gasto do dia a dia',
    color: '#6B7280',
    icon: 'shopping',
    monthlyBudget: remaining,
  };
}

export const DEFAULT_DAYS_DIVISOR = 30;

export interface MigrationPlan {
  /** Movimentações existentes que precisam ser regravadas no formato novo. */
  transactionsToUpdate: Transaction[];
  /** Movimentações `diario` criadas a partir de `realSpends`. */
  transactionsToCreate: Transaction[];
  /** Tags existentes que ganharam orçamento vindo da lista antiga. */
  tagsToUpdate: Tag[];
  /** Categorias de orçamento sem tag equivalente, criadas como tags novas. */
  tagsToCreate: Tag[];
  budgetConfig: BudgetConfig;
  schemaVersion: number;
  /** true quando não há nada a fazer — evita escrita desnecessária no Firestore. */
  isNoop: boolean;
}

/**
 * Monta o plano de migração sem tocar no banco, para que o chamador decida
 * quando escrever e o resultado possa ser testado.
 *
 * Cobre os dois saltos de uma vez: uma conta parada no schema 1 recebe tanto a
 * conversão de tipos e gastos diários quanto a fusão das categorias.
 */
export function planMigration(args: {
  transactions: Transaction[];
  tags?: Tag[];
  realSpends?: RealSpends;
  planningConfig?: PlanningConfig;
  existingBudget?: BudgetConfig;
  currentSchemaVersion?: number;
}): MigrationPlan {
  const {
    transactions,
    tags = [],
    realSpends,
    planningConfig,
    existingBudget,
    currentSchemaVersion = 1,
  } = args;

  const daysDivisor = existingBudget?.daysDivisor || DEFAULT_DAYS_DIVISOR;

  if (currentSchemaVersion >= SCHEMA_VERSION) {
    return {
      transactionsToUpdate: [],
      transactionsToCreate: [],
      tagsToUpdate: [],
      tagsToCreate: [],
      budgetConfig: { daysDivisor },
      schemaVersion: currentSchemaVersion,
      isNoop: true,
    };
  }

  /* --- schema 1 -> 2: tipos, tags N:N e gastos diários --- */

  const transactionsToUpdate = transactions.filter(needsTransactionMigration).map(normalizeTransaction);

  // Não recria um `diario` para uma data que já tem lançamento desse tipo.
  const existingDiarioDates = new Set(
    transactions.filter((t) => t.type === 'diario').map((t) => t.date),
  );
  const transactionsToCreate = realSpendsToTransactions(realSpends ?? {})
    .filter((t) => !existingDiarioDates.has(t.date));

  /* --- schema 2 -> 3: uma lista de categorias só --- */

  // Uma conta que nunca chegou ao schema 2 não tem `budgetConfig`; nesse caso a
  // categoria de orçamento é derivada do planejamento antigo.
  const legacyCategories = existingBudget?.categories ?? [];
  const merge = mergeBudgetCategoriesIntoTags(tags, legacyCategories);

  const noBudgetAnywhere =
    legacyCategories.length === 0 && tags.every((t) => (t.monthlyBudget ?? 0) <= 0);
  const seeded = noBudgetAnywhere ? planningConfigToCategory(planningConfig) : null;
  if (seeded) merge.tagsToCreate.push(seeded);

  return {
    transactionsToUpdate,
    transactionsToCreate,
    tagsToUpdate: merge.tagsToUpdate,
    tagsToCreate: merge.tagsToCreate,
    budgetConfig: { daysDivisor },
    schemaVersion: SCHEMA_VERSION,
    isNoop: false,
  };
}
