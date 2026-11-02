'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ExportButton from "./ExportButton";


interface Expense {
  _id: string;
  categoria: string;
  contato: string;
  telefone: string;
  valor: number;
  descricao?: string;
  data?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function Dashboard({ publicId }: Readonly<{ publicId?: string }>) {
  const readOnly = publicId !== undefined;
  const { data: session } = useSession();
  const userName = session?.user?.name?.trim();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const router = useRouter();



  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(readOnly ? `/api/dashboards/${encodeURIComponent(publicId!)}` : '/api/expenses/list', { cache: 'no-store' });
        if (!res.ok) throw new Error(res.status === 404 ? 'Dashboard não encontrado.' : 'Não foi possível carregar os gastos.');
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      } catch (err) {
        setExpenses([]);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os gastos.');
      } finally {
        setLoading(false);
      }
    }
    void fetchExpenses();
  }, [publicId, readOnly]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const response = await fetch('/api/dashboards/share', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!response.ok) throw new Error('Não foi possível gerar o link.');
      const { id } = await response.json();
      setShareUrl(`${window.location.origin}/Dashboard/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o link.');
    } finally { setSharing(false); }
  };

  const total = expenses.reduce((acc, item) => acc + item.valor, 0);

  const exportData = expenses.map((item, index) => ({
    '#': index + 1,
    'Categoria': item.categoria,
    'Descrição': item.descricao || '',
    'Data': formatDate(item.data),
    'Contato': item.contato || 'N/A',
    'Telefone': item.telefone || 'N/A',
    'Valor (R$)': item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2}) 
  }));
   if (exportData.length > 0) {
    exportData.push({
      '#': 0,
      'Categoria': 'TOTAL',
      'Descrição': '',
      'Data': '',
      'Contato': '',
      'Telefone': '',
      'Valor (R$)': expenses.reduce((acc, item) => acc + item.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2})

    });
  }


  const handleDelete = async (id: string) => {
    if (readOnly) return;
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setExpenses(expenses.filter(exp => exp._id !== id));
    }
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-md w-full ">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-black">Dashboard de Gastos</h1>
        {!readOnly && session?.user && (
          <p className="min-w-0 break-words text-base text-gray-600 sm:max-w-[50%] sm:text-right">
            {userName ? <>Olá, <span className="font-semibold text-gray-900">{userName}</span></> : 'Olá!'}
          </p>
        )}
      </div>
      {readOnly && <p className="mb-4 text-sm text-gray-700">Somente visualização. Você pode consultar os gastos e exportar para Excel.</p>}
      <div className="flex flex-wrap gap-4">
          <ExportButton 
            data={exportData}
            fileName="gastos-casamento"
            sheetName="Gastos"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            disabled={loading || expenses.length === 0}
          />
          {!readOnly && (
            <button type="button" onClick={handleShare} disabled={sharing} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg">
              {sharing ? 'Gerando link...' : 'Compartilhar visualização'}
            </button>
          )}
          
        </div>
      {!readOnly && shareUrl && (
        <div className="my-4 space-y-2 text-sm text-gray-700">
          <p>Qualquer pessoa com este link poderá visualizar e exportar os gastos, incluindo contatos e telefones.</p>
          <label htmlFor="dashboard-share-url" className="block font-medium">Link de visualização</label>
          <input id="dashboard-share-url" type="text" readOnly value={shareUrl} onFocus={event => event.target.select()} className="w-full border rounded px-3 py-2 text-black" />
          <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-block text-blue-700 underline">Abrir visualização pública</a>
        </div>
      )}
      {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
      
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Categoria</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Descrição</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Telefone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Contato</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Valor</th>
                  {!readOnly && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item._id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.categoria}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words max-w-xs">{item.descricao || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(item.data)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.telefone}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.contato}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    {!readOnly && <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs bg-yellow-400 text-black rounded hover:bg-yellow-500 transition-colors"
                          onClick={() => router.push(`/gastos/editar/${item._id}`)}
                        >
                          Editar
                        </button>
                        <button
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          onClick={() => handleDelete(item._id)}
                        >
                          Deletar
                        </button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* <ul className="mb-4">
            {expenses.map((item) => (
              <li key={item._id} className="flex justify-between items-center py-2 border-b">
                <span className="text-black">{item.categoria}</span>
                <span className="text-black"> {item.telefone} </span>
                <span className="text-black"> {item.contato} </span>
                <span className="text-black">R$ {item.valor.toLocaleString()}</span>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 text-xs bg-yellow-400 text-black rounded hover:bg-yellow-500"
                    onClick={() => router.push(`/gastos/editar/${item._id}`)}
                  >
                    Editar
                  </button>
                  <button
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleDelete(item._id)}
                  >
                    Deletar
                  </button>
                </div>
              </li>
            ))}
          </ul> */}
          <div className="text-right font-semibold text-lg text-black">
            Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {!readOnly && <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        onClick={() => router.push('/gastos/cadastrar')}
      >
        Cadastrar Gastos
      </button>}
        </>
      )}
    </div>
   
  );
}
