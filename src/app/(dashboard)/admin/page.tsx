import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/adminAuth';
import AdminClient from './AdminClient';

export const metadata = {
  title: 'Superadmin Command Center | Liable Alerts',
  description: 'Manage platform users, subscriptions, quotas, and global logs.',
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!isSuperAdmin(session.user.email)) {
    redirect('/dashboard');
  }

  return <AdminClient userEmail={session.user.email || ''} />;
}
