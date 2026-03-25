import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import ShiftSettings from '@/components/shift-settings';

export default async function ShiftSettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  return <AdminLayout><ShiftSettings /></AdminLayout>;
}

