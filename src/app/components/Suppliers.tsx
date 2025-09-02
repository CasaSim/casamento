// Novo componente: src/app/components/Suppliers.tsx
import React, { useEffect, useState } from "react";

interface Supplier {
  _id: string;
  nome: string;
  contato: string;
  categoria?: string;
  email?: string;
  observacoes?: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await fetch("/api/suppliers");
        const data = await res.json();
        setSuppliers(data);
      } catch (err) {
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSuppliers();
  }, []);

  return (
    <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-xl mt-8">
      <h2 className="text-xl font-bold mb-4">Fornecedores</h2>
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <ul>
          {suppliers.map((item) => (
            <li key={item._id} className="flex justify-between py-2 border-b">
              <span>{item.nome}</span>
              <span>{item.contato}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}