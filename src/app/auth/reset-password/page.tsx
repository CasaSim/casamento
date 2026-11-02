'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const disabled = loading || !!message || !validToken;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    setError('');
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setError('Use uma senha com pelo menos 12 caracteres e até 72 bytes.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        setPassword('');
        setConfirm('');
      } else {
        setError(data.error || 'Não foi possível redefinir a senha.');
      }
    } catch {
      setError('Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const visibleError = error || (!validToken ? 'Link inválido. Solicite uma nova recuperação de senha.' : '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 text-center">Redefinir Senha</h2>
        <p className="text-gray-600 mb-4">Escolha uma nova senha com pelo menos 12 caracteres.</p>
        <label htmlFor="password" className="sr-only">Nova senha</label>
        <input
          id="password" name="password" type="password" minLength={12} autoComplete="new-password"
          placeholder="Nova senha" value={password} onChange={event => setPassword(event.target.value)}
          required disabled={disabled}
          className="w-full mb-4 px-3 py-2 border rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor="confirm" className="sr-only">Confirme a nova senha</label>
        <input
          id="confirm" name="confirm" type="password" minLength={12} autoComplete="new-password"
          placeholder="Confirme a nova senha" value={confirm} onChange={event => setConfirm(event.target.value)}
          required disabled={disabled}
          className="w-full mb-4 px-3 py-2 border rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" disabled={disabled} className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50">
          {loading ? 'Redefinindo...' : 'Redefinir senha'}
        </button>
        <Link href="/auth/signin" className="block text-center w-full mt-2 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">Voltar ao Login</Link>
        {message && <p role="status" className="text-green-600 mt-4">{message}</p>}
        {visibleError && <div role="alert" className="text-red-600 mt-4">
          <p>{visibleError}</p>
          <Link href="/auth/forgot" className="underline">Solicitar novo link</Link>
        </div>}
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<p>Carregando...</p>}><ResetPasswordForm /></Suspense>;
}
