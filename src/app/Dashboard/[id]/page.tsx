import type { Metadata } from 'next';
import Dashboard from '@/app/components/Dashboard';

export const metadata: Metadata = {
  title: 'Visualização do Dashboard | CasaSim',
  robots: { index: false, follow: false },
};

export default async function SharedDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Dashboard publicId={id} />
    </main>
  );
}
