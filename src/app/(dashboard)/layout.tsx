import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import DashboardShell from './DashboardShell';

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

  const maxEndpoints = subscription?.plan?.maxActiveEndpoints || 5;
  const usagePct = subscription
    ? Math.round((activeCount / maxEndpoints) * 100)
    : 0;

  return (
    <DashboardShell
      companyName={membership?.company?.name || 'Workspace'}
      userName={session.user?.name || 'User'}
      userEmail={session.user?.email || ''}
      subscription={subscription}
      activeCount={activeCount}
      maxEndpoints={maxEndpoints}
      usagePct={usagePct}
    >
      {children}
    </DashboardShell>
  );
}
