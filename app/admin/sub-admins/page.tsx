import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Header from '@/components/header';
import AdminNav from '@/components/admin-nav';
import SubAdminManager from '@/components/sub-admin-manager';

export default async function SubAdminsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <SubAdminManager />
      </div>
    </main>
  );
}
