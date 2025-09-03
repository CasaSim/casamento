'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdicionarGasto() {
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contato, setContato] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!categoria || !valor) {
      setError('Preencha todos os campos.');
      return;
    }
    const res = await fetch('/api/expenses/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria, valor: Number(valor), telefone, contato }),
    });
    if (res.ok) {
      router.push('/Dashboard'); // Redireciona para a página do Dashboard
    } else {
      const data = await res.json();
      setError(data.error || 'Erro ao cadastrar gasto.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold text-black mb-4 text-center">Adicionar Gasto</h2>
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-black"
              placeholder="Ex: Buffet"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-black"
              placeholder="Ex: 5000"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-black"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-black"
              placeholder="Ex: Nome do Contato"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
          >
            Cadastrar
          </button>
        </form>
      </div>
    </div>
  );
}
