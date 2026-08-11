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
    <div className="space-y-[80px] max-w-2xl py-8">
      <div>
        <h1 className="text-[36px] font-serif font-normal text-ink-black leading-none">Settings</h1>
        <p className="text-smoke mt-4 text-[16px] tracking-[-0.32px] leading-[1.35]">Manage your account and workspace settings.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-paper-white rounded-[22px] shadow-subtle p-[20px] space-y-4">
          <h2 className="font-semibold text-[16px] text-ink-black tracking-[-0.32px]">Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1 tracking-[-0.24px]">Name</label>
              <p className="text-[16px] text-graphite tracking-[-0.32px]">{session.user?.name}</p>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1 tracking-[-0.24px]">Email</label>
              <p className="text-[16px] text-graphite tracking-[-0.32px]">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Company */}
        <div className="bg-paper-white rounded-[22px] shadow-subtle p-[20px] space-y-4">
          <h2 className="font-semibold text-[16px] text-ink-black tracking-[-0.32px]">Company</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1 tracking-[-0.24px]">Company Name</label>
              <p className="text-[16px] text-graphite tracking-[-0.32px]">{membership.company.name}</p>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1 tracking-[-0.24px]">Slug</label>
              <p className="text-[14px] font-mono text-smoke tracking-[-0.28px]">{membership.company.slug}</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-paper-white rounded-[22px] shadow-subtle p-[20px] border border-red-100">
          <h2 className="font-semibold text-[16px] text-red-600 tracking-[-0.32px] mb-3">Danger Zone</h2>
          <p className="text-[14px] text-smoke tracking-[-0.28px] mb-4 leading-[1.3]">These actions are irreversible. Please proceed with caution.</p>
          <a href={`mailto:support@liablealerts.com?subject=Account Deletion Request - ${session.user?.email}`}>
            <button className="px-[22px] py-[12px] border-[1.5px] border-red-300 text-red-600 rounded-[50px] text-[14px] font-medium transition-colors hover:bg-red-50">
              Delete Account — Contact Support
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
