import { ArrowDownRight, ArrowUpRight, CreditCard, PiggyBank, Receipt, type LucideIcon } from 'lucide-react';
import type { TransactionType } from '../types';
import { normalizeType } from '../core/recurrence';

export interface TransactionTypeMeta {
  value: TransactionType;
  label: string;
  /** Rótulo curto para chips e células apertadas. */
  short: string;
  /** Frase de ajuda no seletor do modal. */
  hint: string;
  icon: LucideIcon;
  /** Cor do texto e do ícone. */
  tone: string;
  /** Fundo suave para chips, ícones e linhas. */
  toneBg: string;
  /** Borda no mesmo tom, para o estado inativo. */
  toneBorder: string;
  /** Estado selecionado — preenchimento sólido. */
  toneActive: string;
  /** true quando o valor sai do saldo disponível. */
  isOutflow: boolean;
}

/**
 * Paleta deliberadamente contida: verde e vermelho carregam o sinal do dinheiro,
 * cartão e economia ganham um tom próprio porque precisam ser reconhecidos de
 * relance, e `diario` fica neutro — é o tipo mais frequente e não deveria
 * dominar a tela. Estes tokens são a única fonte de cor por tipo no app.
 */
export const TRANSACTION_TYPE_META: Record<TransactionType, TransactionTypeMeta> = {
  entrada: {
    value: 'entrada',
    label: 'Entrada',
    short: 'Entrada',
    hint: 'Salário, freela, presente — soma no saldo na data lançada.',
    icon: ArrowUpRight,
    tone: 'text-emerald-600 dark:text-emerald-400',
    toneBg: 'bg-emerald-500/10',
    toneBorder: 'border-emerald-500/20',
    toneActive: 'bg-emerald-600 text-white border-emerald-600',
    isOutflow: false,
  },
  saida: {
    value: 'saida',
    label: 'Saída',
    short: 'Saída',
    hint: 'Gasto fixo ou grande — aluguel, conta, matrícula.',
    icon: ArrowDownRight,
    tone: 'text-rose-600 dark:text-rose-400',
    toneBg: 'bg-rose-500/10',
    toneBorder: 'border-rose-500/20',
    toneActive: 'bg-rose-600 text-white border-rose-600',
    isOutflow: true,
  },
  diario: {
    value: 'diario',
    label: 'Diário',
    short: 'Diário',
    hint: 'Gasto pequeno do dia a dia, comparado ao seu orçamento diário.',
    icon: Receipt,
    tone: 'text-neutral-10',
    toneBg: 'bg-neutral-02',
    toneBorder: 'border-neutral-04',
    toneActive: 'bg-neutral-12 text-neutral-00 border-neutral-12',
    isOutflow: true,
  },
  economia: {
    value: 'economia',
    label: 'Economia',
    short: 'Economia',
    hint: 'Dinheiro guardado ou investido — sai do disponível, mas conta como poupança.',
    icon: PiggyBank,
    tone: 'text-violet-600 dark:text-violet-400',
    toneBg: 'bg-violet-500/10',
    toneBorder: 'border-violet-500/20',
    toneActive: 'bg-violet-600 text-white border-violet-600',
    isOutflow: true,
  },
  cartao: {
    value: 'cartao',
    label: 'Gasto com cartão',
    short: 'Cartão',
    hint: 'Não sai do saldo hoje — cai na data de vencimento da fatura do cartão.',
    icon: CreditCard,
    tone: 'text-amber-600 dark:text-amber-400',
    toneBg: 'bg-amber-500/10',
    toneBorder: 'border-amber-500/20',
    toneActive: 'bg-amber-600 text-white border-amber-600',
    isOutflow: true,
  },
};

/** Ordem em que os tipos aparecem em seletores e resumos. */
export const TRANSACTION_TYPE_ORDER: TransactionType[] = ['entrada', 'saida', 'diario', 'economia', 'cartao'];

export const TRANSACTION_TYPE_LIST: TransactionTypeMeta[] = TRANSACTION_TYPE_ORDER.map(
  (t) => TRANSACTION_TYPE_META[t],
);

/** Aceita também o tipo legado `fatura`, que é lido como `cartao`. */
export function typeMeta(type: TransactionType | 'fatura'): TransactionTypeMeta {
  return TRANSACTION_TYPE_META[normalizeType(type)];
}

export function isOutflow(type: TransactionType | 'fatura'): boolean {
  return typeMeta(type).isOutflow;
}
