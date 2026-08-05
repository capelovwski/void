import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Firestore rejeita campos com valor `undefined` (ex: tagId de uma transação
// sem categoria) — removemos essas chaves antes de gravar.
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

// CRUD genérico para coleções em users/{userId}/{collectionName}/{id}.
// Usado por transações, tags e bancos — todas seguem o mesmo padrão de
// "lista de entidades com id" isoladas por dono.
export function useUserCollection<T extends { id: string }>(
  userId: string | null,
  collectionName: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // Reseta o espelho local quando o usuário desloga — não há um
      // "getSnapshot" síncrono do Firestore para calcular isso durante o
      // render, então o reset acontece aqui mesmo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, collectionName),
      (snapshot) => {
        const loaded = snapshot.docs.map(
          (docSnap) => ({ ...(docSnap.data() as Omit<T, 'id'>), id: docSnap.id }) as T
        );
        setItems(loaded);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [userId, collectionName]);

  const addItem = async (item: Omit<T, 'id'>) => {
    if (!userId) return;
    await addDoc(collection(db, 'users', userId, collectionName), stripUndefined(item));
  };

  // Upsert com id explícito — usado para editar itens existentes e para
  // migrar/semear dados preservando o id original.
  const setItem = async (item: T) => {
    if (!userId) return;
    const { id, ...rest } = item;
    await setDoc(doc(db, 'users', userId, collectionName, id), stripUndefined(rest));
  };

  const removeItem = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, collectionName, id));
  };

  return { items, loading, addItem, setItem, removeItem };
}
