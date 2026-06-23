export type TransactionType = 'entrada' | 'saida' | 'fatura' | 'economia';

export interface Tag {
  id: string;
  name: string;
  color: string; // hex color code
  icon?: string; // string representing the icon key (e.g., 'utensils')
}

export interface Transaction {
  id: string;
  type: TransactionType;
  value: number;
  description: string;
  date: string; // YYYY-MM-DD format
  tagId?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  value: number;
}

export interface PlanningConfig {
  fixedRevenue: number;
  fixedExpenses: FixedExpense[];
}

export type RealSpends = Record<string, number>; // maps 'YYYY-MM-DD' -> actual spend value

export interface Bank {
  id: string;
  name: string;
  color: string;
  balance: number;
}

