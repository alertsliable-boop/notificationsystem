import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { Settings } from 'lucide-react';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*, company:Company(*)')
    .eq('userId', session.user.id)
    .single();
  if (!membership) return null;

  return (
    <div className="space-y-8 max-w-2xl py-4 sm:py-6">
      <div>
        <h1 className="text-2xl sm:text-[32px] font-bold text-ink-black leading-tight">Settings</h1>
        <p className="text-smoke mt-1 text-sm tracking-[-0.32px] leading-[1.35]">Manage your account and workspace settings.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-paper-white rounded-2xl shadow-subtle p-5 sm:p-6 space-y-4 border border-ash-mist">
          <h2 className="font-semibold text-base text-ink-black tracking-[-0.32px]">Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-smoke mb-1 tracking-[-0.24px]">Name</label>
              <p className="text-sm sm:text-base text-graphite tracking-[-0.32px] font-medium">{session.user?.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-smoke mb-1 tracking-[-0.24px]">Email</label>
              <p className="text-sm sm:text-base text-graphite tracking-[-0.32px] font-medium break-all">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Company */}
        <div className="bg-paper-white rounded-2xl shadow-subtle p-5 sm:p-6 space-y-4 border border-ash-mist">
          <h2 className="font-semibold text-base text-ink-black tracking-[-0.32px]">Company</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-smoke mb-1 tracking-[-0.24px]">Company Name</label>
              <p className="text-sm sm:text-base text-graphite tracking-[-0.32px] font-medium">{membership.company.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-smoke mb-1 tracking-[-0.24px]">Slug</label>
              <p className="text-sm font-mono text-smoke tracking-[-0.28px]">{membership.company.slug}</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-paper-white rounded-2xl shadow-subtle p-5 sm:p-6 border border-red-100">
          <h2 className="font-semibold text-base text-red-600 tracking-[-0.32px] mb-2">Danger Zone</h2>
          <p className="text-sm text-smoke tracking-[-0.28px] mb-4 leading-relaxed">These actions are irreversible. Please proceed with caution.</p>
          <a href={`mailto:support@liablealerts.com?subject=Account Deletion Request - ${session.user?.email}`}>
            <button className="w-full sm:w-auto px-5 py-2.5 border border-red-300 text-red-600 rounded-full text-sm font-medium transition-colors hover:bg-red-50">
              Delete Account — Contact Support
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
