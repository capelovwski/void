import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Note } from '../types';

// Lê e escreve anotações em users/{userId}/notes/{noteId} — cada usuário só
// enxerga o próprio caminho, então este hook nunca precisa filtrar por dono.
export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const notesQuery = query(
      collection(db, 'users', userId, 'notes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const loadedNotes: Note[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            text: data.text as string,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
            userId: data.userId as string,
          };
        });
        setNotes(loadedNotes);
        setLoading(false);
      },
      () => {
        setError('Não foi possível carregar suas anotações. Tente novamente.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const addNote = async (text: string) => {
    if (!userId) return;
    await addDoc(collection(db, 'users', userId, 'notes'), {
      text,
      userId,
      createdAt: serverTimestamp(),
    });
  };

  const updateNote = async (noteId: string, text: string) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId, 'notes', noteId), { text });
  };

  const deleteNote = async (noteId: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'notes', noteId));
  };

  return { notes, loading, error, addNote, updateNote, deleteNote };
}
