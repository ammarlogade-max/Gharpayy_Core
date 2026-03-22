import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import EmployeeNav from '@/components/employee-nav';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import NoticesEmployee from '@/components/notices-employee';
import NoticesManager from '@/components/notices-manager';

export default async function NoticesPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (user.role === 'employee') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <EmployeeNav />
        <div className="max-w-lg mx-auto px-4 py-6">
          <NoticesEmployee />
        </div>
      </div>
    );
  }

  // Admin / Manager view
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <NoticesManager />
      </div>
    </main>
  );
}