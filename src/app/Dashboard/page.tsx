// app/dashboard/page.tsx
import AuthCheck from '../components/AuthCheck';
import Dashboard from '../components/Dashboard';

export default function DashboardPage() {
  return (
    <AuthCheck>
      <Dashboard />
    </AuthCheck>
  );
}