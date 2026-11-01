'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const emptyValues = {
  categoria: '',
  valor: '',
  telefone: '',
  contato: '',
  descricao: '',
  data: '',
};

const fields = [
  { name: 'categoria', label: 'Categoria', type: 'text', placeholder: 'Ex: Buffet' },
  { name: 'valor', label: 'Valor', type: 'number', placeholder: 'Ex: 5000' },
  { name: 'telefone', label: 'Telefone', type: 'text', placeholder: 'Ex: (XX) XXXXX-XXXX' },
  { name: 'contato', label: 'Contato', type: 'text', placeholder: 'Ex: Nome do Contato' },
  { name: 'descricao', label: 'Descrição', type: 'textarea', placeholder: 'Ex: Entrada do buffet para 100 convidados' },
  { name: 'data', label: 'Data', type: 'date', placeholder: '' },
] as const;

const inputClassName = 'mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black';

export default function ExpenseForm({ expenseId }: { expenseId?: string }) {
  const editing = expenseId !== undefined;
  const endpoint = editing ? `/api/expenses/${encodeURIComponent(expenseId)}` : '/api/expenses/list';
  const [values, setValues] = useState(emptyValues);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const saveError = editing ? 'Erro ao editar gasto.' : 'Erro ao cadastrar gasto.';

  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();

    async function fetchExpense() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(endpoint, { signal: controller.signal });
        if (!res.ok) throw new Error('Erro ao carregar gasto.');
        const expense = await res.json();
        if (controller.signal.aborted) return;
        setValues({
          categoria: expense.categoria,
          valor: String(expense.valor),
          telefone: expense.telefone || '',
          contato: expense.contato || '',
          descricao: expense.descricao || '',
          data: expense.data ? expense.data.slice(0, 10) : '',
        });
      } catch {
        if (!controller.signal.aborted) setError('Erro ao carregar gasto.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchExpense();
    return () => controller.abort();
  }, [editing, endpoint]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || saving) return;
    setError('');
    if (!values.categoria || !values.valor) {
      setError('Preencha todos os campos.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, valor: Number(values.valor) }),
      });
      if (res.ok) {
        router.push('/Dashboard');
      } else {
        const response = await res.json();
        setError(response.error || saveError);
      }
    } catch {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold text-black mb-4 text-center">{editing ? 'Editar Gasto' : 'Adicionar Gasto'}</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {fields.map(field => {
            const props = {
              id: field.name,
              name: field.name,
              value: values[field.name],
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const value = event.target.value;
                setValues(current => ({ ...current, [field.name]: value }));
              },
              className: inputClassName,
              placeholder: field.placeholder,
              disabled: loading || saving,
            };

            return (
              <div key={field.name}>
                <label htmlFor={field.name} className="block text-sm font-medium text-black">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea {...props} maxLength={2000} rows={3} />
                ) : (
                  <input {...props} type={field.type} required={field.name === 'categoria' || field.name === 'valor'} />
                )}
              </div>
            );
          })}
          {error && <div role="alert" className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            disabled={loading || saving}
            className={`w-full py-2 px-4 rounded transition-colors disabled:opacity-50 ${editing ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            {editing ? 'Salvar' : 'Cadastrar'}
          </button>
        </form>
        {editing && (
          <button
            type="button"
            className="w-full py-2 px-4 bg-red-400 text-black rounded hover:bg-red-500 transition-colors"
            onClick={() => router.back()}
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
}
