'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditarGasto() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [categoria, setCategoria] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contato, setContato] = useState('');
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchExpense() {
      const res = await fetch(`/api/expenses/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCategoria(data.categoria);
        setTelefone(data.telefone || '');
        setContato(data.contato || '');
        setValor(data.valor.toString());
      }
    }
    if (id) fetchExpense();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!categoria || !valor) {
      setError('Preencha todos os campos.');
      return;
    }
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria, telefone, contato, valor: Number(valor) }),
    });
    if (res.ok) {
      router.push('/Dashboard');
    } else {
      const data = await res.json();
      setError(data.error || 'Erro ao editar gasto.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold text-black mb-4 text-center">Editar Gasto</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-black">Categoria</label>
            <input
              id="categoria"
              name="categoria"
              type="text"
              required
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Ex: Buffet"
            />
          </div>
          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-black">Telefone</label>
            <input
              id="telefone"
              name="telefone"
              type="text"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Ex: (XX) XXXXX-XXXX"
            />
          </div>
          <div>
            <label htmlFor="contato" className="block text-sm font-medium text-black">Contato</label>
            <input
              id="contato"
              name="contato"
              type="text"
              value={contato}
              onChange={e => setContato(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Ex: Nome do Contato"
            />
          </div>
          <div>
            <label htmlFor="valor" className="block text-sm font-medium text-black">Valor</label>
            <input
              id="valor"
              name="valor"
              type="number"
              required
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Ex: 5000"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-yellow-400 text-black rounded hover:bg-yellow-500 transition-colors"
          >
            Salvar
          </button>
        </form>
        <button
            type="submit"
            className="w-full py-2 px-4 bg-red-400 text-black rounded hover:bg-red-500 transition-colors"
            onClick={() => router.back()}
          >
            Voltar
          </button>
      </div>
    </div>
  );
}