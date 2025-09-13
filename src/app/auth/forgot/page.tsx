'use client';

import { useState } from 'react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
    } else {
      setError(data.error || 'Erro ao enviar e-mail.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 text-center">Recuperar Senha</h2>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 border rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Enviar link de recuperação
        </button>
        <button
          type="button"
          onClick={() => window.location.href = '/auth/signin'}
          className="w-full mt-2 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
        >
          Voltar ao Login
        </button>
        {message && <div className="text-green-600 mt-4">{message}</div>}
        {error && <div className="text-red-600 mt-4">{error}</div>}
      </form>
    </div>
  );
}
