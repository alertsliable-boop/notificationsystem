import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { CreditCard, Zap, CheckCircle2, ArrowUpCircle, TrendingUp, Shield, Mail, Users, Clock, Star, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SwitchPlanButton } from './PlanManager';

export const metadata = { title: 'Billing & Subscription Plans | Liable Alerts' };

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*, company:Company(*)')
    .eq('userId', session.user.id)
    .single();
  if (!membership) return null;

  const [
    { data: subscription },
    { count: activeCount },
    { data: dbPlansData }
  ] = await Promise.all([
    supabase.from('CompanySubscription').select('*, plan:SubscriptionPlan(*)').eq('companyId', membership.companyId).single(),
    supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }).eq('companyId', membership.companyId).eq('status', 'ACTIVE'),
    supabase.from('SubscriptionPlan').select('*').order('priceCents', { ascending: true })
  ]);
  
  const dbPlans = dbPlansData || [];

  const currentPlanCode = subscription?.plan?.code;
  const maxEndpoints = subscription?.plan?.maxActiveEndpoints ?? 5;
  const currentActive = activeCount || 0;
  const usagePct = subscription ? Math.min((currentActive / maxEndpoints) * 100, 100) : 0;
  const isOverLimit = currentActive > maxEndpoints;

  const getFeatures = (code: string, max: number) => {
    if (code === 'starter') return [`Up to ${max} Active Email Endpoints`, 'Unlimited SMS Recipients', 'Full Delivery Logs & Audit Trails', 'Standard Email Support', 'Basic Alert Analytics'];
    if (code === 'pro') return [`Up to ${max} Active Email Endpoints`, 'Unlimited SMS Recipients', 'Full Delivery Logs & Audit Trails', 'Priority Support', 'Advanced Alert Analytics', 'API & Webhooks Access'];
    if (code === 'business') return [`Up to ${max} Active Email Endpoints`, 'Unlimited SMS Recipients', 'Full Delivery Logs & Audit Trails', '24/7 Dedicated Support', 'Multi-site Management', 'Custom Email Domains', 'SLA Guarantees'];
    return [`${max}+ Custom Active Email Endpoints`, 'Dedicated SMS Gateways', 'Unlimited Team Members', 'Enterprise SLA & Compliance', 'Custom Integrations', 'Dedicated Account Manager'];
  };

  const PLANS = dbPlans.map(p => ({
    ...p,
    features: getFeatures(p.code, p.maxActiveEndpoints),
    recommended: p.code === 'pro'
  }));

  return (
    <div className="space-y-[60px] animate-fadeIn max-w-5xl py-8">
      {/* Header */}
      <div>
        <h1 className="text-[36px] font-serif font-normal text-ink-black leading-none">Billing & Subscription Plans</h1>
        <p className="text-smoke mt-4 text-[16px] tracking-[-0.32px] leading-[1.35]">
          Manage your subscription tier based on active inbound email accounts
        </p>
      </div>

      {/* Quota Alert if Over Limit */}
      {isOverLimit && (
        <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 text-[16px]">Active Account Limit Exceeded</h3>
            <p className="text-red-700 text-[14px] mt-1">
              Your company has <strong>{currentActive}</strong> active email accounts, which exceeds your current plan limit of <strong>{maxEndpoints}</strong>. Please upgrade your subscription plan or deactivate surplus endpoints to restore normal notification dispatching.
            </p>
          </div>
        </div>
      )}

      {/* Current Usage Card */}
      <Card className="border-signal-blue/15 bg-signal-blue/5 shadow-subtle">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-signal-blue rounded-full flex items-center justify-center shadow-subtle-5">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-smoke uppercase tracking-wider">Current Active Subscription</p>
                  <h2 className="text-[24px] font-semibold text-ink-black tracking-[-0.48px] leading-tight">{subscription?.plan?.name ?? 'Starter'} Plan</h2>
                </div>
              </div>
            </div>
            <Badge variant={subscription?.status === 'ACTIVE' ? 'success' : 'danger'}>
              {subscription?.status ?? 'ACTIVE'}
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-[14px] mb-2 tracking-[-0.28px]">
                <span className="font-medium text-graphite">Active Inbound Email Accounts</span>
                <span className="font-bold text-ink-black">{currentActive} / {maxEndpoints}</span>
              </div>
              <div className="w-full bg-ash-mist/80 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-600' : usagePct >= 90 ? 'bg-amber-500' : 'bg-signal-blue'}`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              {usagePct >= 80 && !isOverLimit && (
                <p className="text-[12px] text-amber-700 font-semibold mt-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Approaching plan capacity ({currentActive} of {maxEndpoints} endpoints active).
                </p>
              )}
            </div>
            
            <div className="space-y-3 border-l border-ash-mist/40 md:pl-6">
              <div className="flex items-center gap-2 text-[14px] tracking-[-0.28px]">
                <Mail className="w-4 h-4 text-signal-blue" />
                <span className="text-graphite">Independent Endpoint Configuration</span>
              </div>
              <div className="flex items-center gap-2 text-[14px] tracking-[-0.28px]">
                <Clock className="w-4 h-4 text-signal-blue" />
                <span className="text-graphite">Real-time SMS Forwarding & Delivery Logs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div>
        <div className="text-center mb-12">
          <h2 className="text-[28px] font-serif font-normal text-ink-black leading-none">Subscription Plans</h2>
          <p className="text-smoke mt-4 text-[16px] tracking-[-0.32px]">
            Billed transparently based on active inbound email accounts
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            return (
              <Card 
                key={plan.code} 
                className={`relative flex flex-col justify-between ${plan.recommended ? 'border-signal-blue ring-[1.5px] ring-signal-blue/20 shadow-subtle-5' : 'border-ash-mist'}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge variant="info" className="shadow-subtle">
                      <Star className="w-3.5 h-3.5 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-6">
                  <div className="mb-4">
                    <h3 className="text-[20px] font-semibold text-ink-black tracking-[-0.4px] mb-1">{plan.name}</h3>
                    {isCurrent && <Badge variant="success" className="text-xs">Active Plan</Badge>}
                  </div>
                  <div className="mb-4">
                    <span className="text-[36px] font-bold text-ink-black tracking-[-0.72px]">${(plan.priceCents / 100).toFixed(0)}</span>
                    <span className="text-smoke text-[14px] ml-1">/month</span>
                  </div>
                  <p className="text-[14px] font-semibold text-signal-blue tracking-[-0.28px]">
                    {plan.maxActiveEndpoints} Active Email Accounts
                  </p>
                </CardHeader>

                <CardContent className="pt-0 flex-1">
                  <ul className="space-y-4 mb-6">
                    {plan.features.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-3 text-[14px] tracking-[-0.28px]">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-graphite">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <SwitchPlanButton 
                    planCode={plan.code} 
                    planName={plan.name}
                    currentPrice={subscription?.plan?.priceCents ?? 0} 
                    newPrice={plan.priceCents} 
                    isCurrent={isCurrent}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Custom Enterprise Plan Section */}
        <div className="mt-12 p-6 bg-paper-white border border-ash-mist rounded-[22px] shadow-subtle">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-signal-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-signal-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-[18px] text-ink-black tracking-[-0.32px] mb-1">Need a Custom Enterprise Plan?</h3>
              <p className="text-[14px] text-smoke tracking-[-0.28px] mb-4 leading-[1.35]">
                For large-scale industrial operations requiring more than 100 inbound email accounts, dedicated SMS infrastructure, or custom integrations.
              </p>
              <a href="mailto:sales@liablealerts.com?subject=Enterprise%20Plan%20Inquiry">
                <Button variant="outline" size="sm">
                  Contact Sales & Custom Tier
                </Button>
              </a>
            </div>
          </div>
        </div>

        <p className="text-[12px] text-smoke mt-6 text-center tracking-[-0.24px]">
          * Active email accounts can be toggled on/off at any time in the Endpoints dashboard. Automated billing powered by Stripe.
        </p>
      </div>
    </div>
  );
}
