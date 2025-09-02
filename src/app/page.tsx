'use client';

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative bg-gray-800 p-8 overflow-hidden"
    >
      {/* Imagem de fundo sutil */}
      <img
        src="/landing.jpg"
        alt="Casamento"
        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      <main className="flex flex-col items-center gap-8 relative z-10">
        <h1 className="text-5xl font-extrabold text-blue-500 mb-4">CasaSim</h1>
        <p className="text-lg text-white-700 mb-8 text-center max-w-xl">
          Organize seu casamento com praticidade, controle de gastos, fornecedores e agenda em um só lugar.
        </p>
        <div className="flex gap-4">
        <button
          className="px-8 py-3 bg-blue-500 text-white rounded-md text-lg font-semibold hover:bg-blue-600 transition-colors "
          onClick={() => router.push('/auth/signin')}
        >
          Login
        </button>
        
        <button
          className="px-8 py-3 bg-blue-500 text-white rounded-md text-lg font-semibold hover:bg-blue-600 transition-colors"
          onClick={() => router.push('/Dashboard')}
        >
          Dashboard
        </button>
        </div>
      </main>
      <footer className="mt-16 text-black text-sm text-center relative z-10">
        &copy; {new Date().getFullYear()} CasaSim. Todos os direitos reservados.
      </footer>
    </div>
  );
}
