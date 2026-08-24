import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Zap, LogOut, Mail } from 'lucide-react';
import { MainSidebarNav, SettingsSidebarNav } from './SidebarNav';
import PageTransition from '@/components/PageTransition';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  // Ensure session and user ID exist, otherwise redirect
  if (!session || !session.user || !session.user.id) {
    redirect('/login');
  }

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*, company:Company(*)')
    .eq('userId', session.user.id)
    .limit(1)
    .single();

  let subscription = null;
  if (membership?.companyId) {
    const { data } = await supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', membership.companyId)
      .single();
    subscription = data;
  }

  let activeCount = 0;
  if (membership?.companyId) {
    const { count } = await supabase
      .from('InboundEndpoint')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', membership.companyId)
      .eq('status', 'ACTIVE');
    activeCount = count || 0;
  }

  const usagePct = subscription
    ? Math.round((activeCount / subscription.plan.maxActiveEndpoints) * 100)
    : 0;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white flex flex-col flex-shrink-0 border-r border-gray-100 shadow-sm">
        {/* Logo */}
        <div className="h-16 px-5 border-b border-gray-100 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Zap className="w-4.5 h-4.5 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="font-bold text-[15px] text-gray-900 block leading-tight tracking-tight">Liable Alerts</span>
              <span className="text-[11px] text-gray-400 truncate max-w-[140px] block">{membership?.company?.name || 'Workspace'}</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Main</p>
            <MainSidebarNav />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Settings</p>
            <SettingsSidebarNav />
          </div>
        </nav>

        {/* Usage Widget */}
        {subscription && (
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3.5 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Plan Usage</span>
                <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                  {subscription.plan.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px] font-bold text-gray-900">{activeCount}</span>
                <span className="text-[11px] text-gray-500">/ {subscription.plan.maxActiveEndpoints} endpoints</span>
              </div>
              <div className="h-1.5 bg-white rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <Link href="/billing" className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-2.5 inline-flex items-center gap-1">
                Manage Plan →
              </Link>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
              {session.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-gray-900">{session.user?.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{session.user?.email}</p>
            </div>
          </div>
          <Link
            href="/api/auth/signout?callbackUrl=/"
            className="flex items-center justify-center gap-2 w-full text-[12px] text-gray-500 hover:text-gray-700 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors mt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-100 px-8 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">{membership?.company?.name}</h2>
            <p className="text-[11px] text-gray-400">Email-to-SMS Alert Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot" />
              <span className="text-[11px] font-semibold text-green-700">Live</span>
            </div>
            <Link
              href="/endpoints/new"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Mail className="w-3.5 h-3.5" />
              New Endpoint
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <div className="max-w-[1280px] mx-auto">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}
