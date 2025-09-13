'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { LogIn } from 'lucide-react';
import { Suspense } from 'react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });
    if (res?.error) {
      setError('Usuário ou senha inválidos');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CasaSim - Login
          </h2>
          <p className="mt-2 text-center text-sm text-white-600">
            Gerencie seu casamento com facilidade
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-white text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-white text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
              />
            </div>
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <LogIn className="w-5 h-5 mr-2 bg-white rounded-full" />
            Entrar
          </button>
        </form>          
        </Suspense>
        <div className="text-center mt-4">
        <button
            className="text-white hover:text-blue-200 font-medium"
            onClick={() => window.location.href = '/auth/forgot'}
          >
            Esqueci a senha
          </button>
          </div>

        <div className="text-center mt-4">
          <button
            className="text-blue-600 hover:text-blue font-medium"
            onClick={() => window.location.href = '/auth/signup'}
          >
            Cadastre-se
          </button>
        </div>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Ao entrar, você concorda com nossos{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}