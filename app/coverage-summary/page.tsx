import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import CoverageSummary from '@/components/coverage-summary';

export default async function CoverageSummaryPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <CoverageSummary />
      </div>
    </main>
  );
}
