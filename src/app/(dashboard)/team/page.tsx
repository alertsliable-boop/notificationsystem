import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { Users, Shield, Crown, UserCheck, Mail } from 'lucide-react';
import { TeamInviteForm, RemoveMemberButton } from './TeamManager';

export const metadata = { title: 'Team | Liable Alerts' };

const roleConfig: Record<string, { label: string; icon: any; className: string }> = {
  OWNER: { label: 'Owner', icon: Crown, className: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  ADMIN: { label: 'Admin', icon: Shield, className: 'bg-blue-50 text-blue-700 border-blue-100' },
  MEMBER: { label: 'Member', icon: UserCheck, className: 'bg-green-50 text-green-700 border-green-100' },
  BILLING: { label: 'Billing', icon: UserCheck, className: 'bg-purple-50 text-purple-700 border-purple-100' },
};

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*')
    .eq('userId', session.user.id)
    .limit(1)
    .single();
    
  if (!membership) return null;

  const { data: membershipsData } = await supabase
    .from('Membership')
    .select('*, user:User(id, name, email, createdAt)')
    .eq('companyId', membership.companyId)
    .order('role', { ascending: true });
    
  const memberships = membershipsData || [];

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role);

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Team Members</h1>
          <p className="text-gray-500 text-[14px] mt-1">Manage who has access to your workspace</p>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-[14px] font-bold text-gray-900">{memberships.length} Members</h2>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {memberships.map((m: any) => {
            const role = roleConfig[m.role] || roleConfig.MEMBER;
            const isCurrentUser = m.userId === session.user.id;
            return (
              <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0">
                  {(m.user.name || m.user.email).charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-900">{m.user.name || 'Unknown'}</p>
                    {isCurrentUser && (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    {m.user.email}
                  </p>
                </div>

                {/* Role Badge & Actions */}
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-semibold ${role.className}`}>
                    <role.icon className="w-3 h-3" />
                    {role.label}
                  </span>
                  
                  {isOwnerOrAdmin && (
                    <RemoveMemberButton id={m.id} disabled={isCurrentUser || m.role === 'OWNER'} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Area */}
      {isOwnerOrAdmin && (
        <TeamInviteForm />
      )}

      {/* Role Legend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Role Permissions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(roleConfig).map(([key, r]) => (
            <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold flex-shrink-0 ${r.className}`}>
                <r.icon className="w-3 h-3" />
                {r.label}
              </span>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {key === 'OWNER' ? 'Full control over workspace, billing, and team' :
                 key === 'ADMIN' ? 'Manage endpoints, customers, sites, and team' :
                 key === 'MEMBER' ? 'View notifications and manage endpoints' :
                 'View billing and plan information only'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
