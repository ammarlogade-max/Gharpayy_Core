import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminApprovals from '@/components/admin-approvals';
import EmployeeManager from '@/components/employee-manager';
import AdminLayout from '@/components/admin-layout';

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');
  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminApprovals />
        <EmployeeManager />
      </div>
    </AdminLayout>
  );
}
