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

  // Fetch membership first (need companyId for subsequent queries)
  const { data: membership } = await supabase
    .from('Membership')
    .select('*, company:Company(*)')
    .eq('userId', session.user.id)
    .limit(1)
    .single();

  // If no membership, redirect to login — account may not be fully set up
  if (!membership?.companyId) {
    redirect('/login');
  }

  // Run subscription + active count in parallel to reduce DB round-trips
  const [{ data: subscriptionData }, { count: activeCountResult }] = await Promise.all([
    supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', membership.companyId)
      .single(),
    supabase
      .from('InboundEndpoint')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', membership.companyId)
      .eq('status', 'ACTIVE'),
  ]);

  const subscription = subscriptionData;
  const activeCount = activeCountResult || 0;
  const maxEndpoints = subscription?.plan?.maxActiveEndpoints || 5;
  const usagePct = Math.round((activeCount / maxEndpoints) * 100);

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
