'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!password || !confirm) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!token) {
      setError('Token inválido.');
      return;
    }

    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Senha redefinida com sucesso! Você será redirecionado para o login.');
      setTimeout(() => router.push('/auth/signin'), 3000);
    } else {
      setError(data.error || 'Erro ao redefinir senha.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 text-center">Redefinir Senha</h2>
        <input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 border rounded text-black"
        />
        <input
          type="password"
          placeholder="Confirme a nova senha"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 border rounded text-black"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Redefinir senha
        </button>
        {message && <div className="text-green-600 mt-4">{message}</div>}
        {error && <div className="text-red-600 mt-4">{error}</div>}
      </form>
    </div>
  );
}