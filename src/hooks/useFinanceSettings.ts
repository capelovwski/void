import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { BudgetConfig, PlanningConfig, RealSpends } from '../types';

export interface FinanceSettings {
  initialBalance: number;

  /** Orçamento por categorias que gera o gasto diário sugerido. */
  budgetConfig?: BudgetConfig;

  /** Versão do formato dos dados; ausente significa 1 (ver core/migration.ts). */
  schemaVersion?: number;

  /**
   * Campos do modelo antigo, mantidos após a migração.
   * `planningConfig` ainda guarda receita e despesas fixas — que não são gasto
   * do dia a dia e por isso não viraram categorias de orçamento. `realSpends`
   * fica como histórico: seus valores já foram copiados para movimentações
   * do tipo `diario`.
   */
  planningConfig: PlanningConfig;
  realSpends: RealSpends;
}

// Documento único em users/{userId}/settings/finance. Diferente de
// transações/tags/bancos, esses valores não são uma lista de entidades —
// são um "blob" de configuração editado como um todo, então cabem melhor
// como campos de um único documento.
export function useFinanceSettings(userId: string | null) {
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // Reseta o espelho local quando o usuário desloga — não há um
      // "getSnapshot" síncrono do Firestore para calcular isso durante o
      // render, então o reset acontece aqui mesmo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'users', userId, 'settings', 'finance');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setSettings(snap.exists() ? (snap.data() as FinanceSettings) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [userId]);

  const updateSettings = async (partial: Partial<FinanceSettings>) => {
    if (!userId) return;
    await setDoc(doc(db, 'users', userId, 'settings', 'finance'), partial, { merge: true });
  };

  return { settings, loading, updateSettings };
}
