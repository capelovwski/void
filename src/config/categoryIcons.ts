import {
  BookOpen, Briefcase, Car, Film, Heart, Home, PiggyBank, ShoppingBag, Utensils, Wrench,
  type LucideIcon,
} from 'lucide-react';

/** Biblioteca fechada de ícones de categoria — a chave é o que fica salvo em `Tag.icon`. */
export const CATEGORY_ICONS = {
  utensils: Utensils,
  film: Film,
  piggy: PiggyBank,
  car: Car,
  heart: Heart,
  home: Home,
  shopping: ShoppingBag,
  book: BookOpen,
  wrench: Wrench,
  briefcase: Briefcase,
} satisfies Record<string, LucideIcon>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_LABELS: Record<CategoryIconKey, string> = {
  utensils: 'Alimentação',
  film: 'Lazer',
  piggy: 'Investimento',
  car: 'Transporte',
  heart: 'Saúde',
  home: 'Moradia',
  shopping: 'Compras',
  book: 'Educação',
  wrench: 'Serviços',
  briefcase: 'Trabalho/Outros',
};

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = 'briefcase';

/** Resolve a chave salva para o componente, caindo no padrão quando ela não existe mais. */
export function categoryIcon(key?: string): LucideIcon {
  return CATEGORY_ICONS[key as CategoryIconKey] ?? CATEGORY_ICONS[DEFAULT_CATEGORY_ICON];
}
