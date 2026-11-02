'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) setMessage(data.message);
      else setError(data.error || 'Não foi possível solicitar a recuperação. Tente novamente.');
    } catch {
      setError('Não foi possível solicitar a recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 text-center">Recuperar Senha</h2>
        <p className="text-gray-600 mb-4">Informe seu e-mail cadastrado para receber um link de redefinição de senha.</p>
        <label htmlFor="email" className="sr-only">E-mail cadastrado</label>
        <input
          id="email" name="email" type="email" autoComplete="email" placeholder="Seu e-mail"
          value={email} onChange={event => setEmail(event.target.value)} required disabled={loading}
          className="w-full mb-4 px-3 py-2 border rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50">
          {loading ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
        <Link href="/auth/signin" className="block text-center w-full mt-2 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">Voltar ao Login</Link>
        {message && <p role="status" className="text-green-600 mt-4">{message}</p>}
        {error && <p role="alert" className="text-red-600 mt-4">{error}</p>}
      </form>
    </div>
  );
}
