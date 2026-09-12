import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/adminAuth';
import { cookies } from 'next/headers';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    redirect('/login');
  }

  const supabase = getAdminClient();
  const superAdmin = isSuperAdmin(session.user?.email);

  // Fetch membership first (need companyId for subsequent queries)
  const { data: membership } = await supabase
    .from('Membership')
    .select('*, company:Company(*)')
    .eq('userId', session.user.id)
    .limit(1)
    .single();

  if (!membership?.companyId) {
    redirect('/login');
  }

  let effectiveCompanyId = membership.companyId;
  let activeCompanyName = membership.company?.name || 'Workspace';
  let isImpersonating = false;
  let allCompanies: { id: string; name: string; slug: string }[] = [];

  if (superAdmin) {
    const cookieStore = await cookies();
    const overrideCompanyId = cookieStore.get('admin_active_company_id')?.value;

    // Fetch all companies for workspace switcher
    const { data: companiesList } = await supabase
      .from('Company')
      .select('id, name, slug')
      .order('name');

    allCompanies = companiesList || [];

    if (overrideCompanyId && overrideCompanyId !== membership.companyId) {
      const targetCompany = allCompanies.find((c) => c.id === overrideCompanyId);
      if (targetCompany) {
        effectiveCompanyId = targetCompany.id;
        activeCompanyName = targetCompany.name;
        isImpersonating = true;
      }
    }
  }

  // Run subscription + active count in parallel
  const [{ data: subscriptionData }, { count: activeCountResult }] = await Promise.all([
    supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', effectiveCompanyId)
      .single(),
    supabase
      .from('InboundEndpoint')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', effectiveCompanyId)
      .eq('status', 'ACTIVE'),
  ]);

  const subscription = subscriptionData;
  const activeCount = activeCountResult || 0;

  // For superadmin in their own workspace, endpoints are unlimited
  const baseAllowed = subscription?.plan?.maxActiveEndpoints || 1;
  const extraAllowed = subscription?.extraEndpoints || 0;
  const maxEndpoints = superAdmin && !isImpersonating ? 999999 : (baseAllowed + extraAllowed);
  const usagePct = Math.round((activeCount / Math.min(maxEndpoints, 100)) * 100);

  return (
    <DashboardShell
      companyName={activeCompanyName}
      userName={session.user?.name || 'User'}
      userEmail={session.user?.email || ''}
      subscription={subscription}
      activeCount={activeCount}
      maxEndpoints={maxEndpoints}
      usagePct={usagePct}
      isSuperAdmin={superAdmin}
      isImpersonating={isImpersonating}
      effectiveCompanyId={effectiveCompanyId}
      allCompanies={allCompanies}
    >
      {children}
    </DashboardShell>
  );
}
