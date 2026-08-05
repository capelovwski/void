import React, { useState } from 'react';
import { NotebookPen, Plus, Pencil, Trash2, Check, X, LogOut, CircleAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../hooks/useNotes';
import { AuthScreen } from './auth/AuthScreen';

export const NotesTab: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const { notes, loading: notesLoading, error, addNote, updateNote, deleteNote } = useNotes(user?.uid ?? null);

  const [newNoteText, setNewNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="w-6 h-6 border-2 border-neutral-08 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Área exclusiva: só aparece depois que o usuário está autenticado.
  if (!user) {
    return (
      <div className="space-y-6 pb-24 animate-appear max-w-5xl mx-auto w-full">
        <div className="bg-neutral-00 p-6 rounded-2xl border border-neutral-03/80 shadow-sm">
          <h2 className="text-xl font-bold font-albert-sans text-neutral-11 flex items-center gap-2">
            <NotebookPen size={20} className="text-neutral-08" />
            Anotações
          </h2>
          <p className="text-xs text-neutral-08 mt-1">Faça login ou cadastre-se para ver e criar suas anotações pessoais.</p>
        </div>
        <AuthScreen />
      </div>
    );
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newNoteText.trim();
    if (!text) return;

    setIsSaving(true);
    try {
      await addNote(text);
      setNewNoteText('');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEditing = async (id: string) => {
    const text = editingText.trim();
    if (!text) return;
    await updateNote(id, text);
    cancelEditing();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta anotação? Essa ação não pode ser desfeita.')) {
      await deleteNote(id);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-appear max-w-5xl mx-auto w-full">
      {/* Page Title Header */}
      <div className="bg-neutral-00 p-6 rounded-2xl border border-neutral-03/80 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-albert-sans text-neutral-11 flex items-center gap-2">
            <NotebookPen size={20} className="text-neutral-08" />
            Anotações
          </h2>
          <p className="text-xs text-neutral-08 mt-1">Logado como {user.email}</p>
        </div>
        <button
          onClick={() => logout()}
          className="btn-outline px-4 py-2.5 text-xs rounded-xl flex items-center gap-2 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 flex-shrink-0"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>

      {/* New Note Form */}
      <form onSubmit={handleAddNote} className="card-premium p-6 space-y-4">
        <label htmlFor="new-note" className="text-sm font-semibold text-neutral-10 block">Nova anotação</label>
        <div className="relative rounded-xl border border-neutral-03 overflow-hidden bg-neutral-01 focus-within:border-neutral-11 transition-colors">
          <textarea
            id="new-note"
            placeholder="Escreva sua anotação aqui..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-transparent text-neutral-11 focus:outline-none placeholder-neutral-06 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving || !newNoteText.trim()}
          className="btn-filled-main text-sm px-6 py-3 rounded-xl flex items-center gap-2 ml-auto"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </form>

      {/* Notes List */}
      <div className="card-premium p-6 space-y-4">
        <h3 className="text-base font-bold font-albert-sans text-neutral-11">
          Suas anotações {notes.length > 0 && `(${notes.length})`}
        </h3>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <CircleAlert size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notesLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-5 h-5 border-2 border-neutral-08 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-neutral-08 text-center py-8">Nenhuma anotação ainda. Crie a primeira acima.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-4 rounded-xl bg-neutral-01/50 border border-neutral-02">
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      autoFocus
                      className="w-full px-3 py-2 bg-neutral-00 border border-neutral-03 rounded-lg text-sm text-neutral-11 focus:outline-none focus:border-neutral-11 resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={cancelEditing}
                        className="btn-outline px-3 py-2 text-xs rounded-lg flex items-center gap-1.5"
                      >
                        <X size={13} />
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEditing(note.id)}
                        disabled={!editingText.trim()}
                        className="btn-filled px-3 py-2 text-xs rounded-lg flex items-center gap-1.5"
                      >
                        <Check size={13} />
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-11 whitespace-pre-wrap break-words">{note.text}</p>
                      <span className="text-[10px] text-neutral-06 mt-2 block">
                        {new Date(note.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEditing(note.id, note.text)}
                        className="p-2 rounded-lg text-neutral-08 hover:text-neutral-11 hover:bg-neutral-02 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-2 rounded-lg text-neutral-08 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
