import type { Tag } from '../types';

/**
 * Tags criadas na primeira carga de uma conta nova. É o único dado semeado
 * automaticamente — nenhuma movimentação fictícia é criada.
 */
export const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Salário', color: '#10B981', icon: 'briefcase' },
  { id: '2', name: 'Alimentação', color: '#EF4444', icon: 'utensils' },
  { id: '3', name: 'Moradia', color: '#F59E0B', icon: 'home' },
  { id: '4', name: 'Lazer', color: '#EC4899', icon: 'film' },
  { id: '5', name: 'Transporte', color: '#3B82F6', icon: 'car' },
  { id: '6', name: 'Investimento', color: '#6366F1', icon: 'piggy' },
  { id: '7', name: 'Saúde', color: '#14B8A6', icon: 'heart' },
];
