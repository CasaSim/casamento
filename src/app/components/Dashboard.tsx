'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Expense {
  _id: string;
  categoria: string;
  contato: string;
  telefone: string;
  valor: number;
}

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchExpenses() {
      try {
        const res = await fetch("/api/expenses/list");
        const data = await res.json();
        setExpenses(data);
      } catch (err) {
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchExpenses();
  }, []);

  const total = expenses.reduce((acc, item) => acc + item.valor, 0);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setExpenses(expenses.filter(exp => exp._id !== id));
    }
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-md w-full ">
      <h1 className="text-2xl font-bold mb-4 text-black">Dashboard de Gastos</h1>
      
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Categoria</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Telefone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Contato</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Valor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Ações</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item._id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.categoria}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.telefone}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.contato}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
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
                    </td>
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
          <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        onClick={() => router.push('/gastos/cadastrar')}
      >
        Cadastrar Gastos
      </button>
        </>
      )}
    </div>
   
  );
}