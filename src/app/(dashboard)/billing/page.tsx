import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { CreditCard, Zap, CheckCircle2, ArrowUpCircle, TrendingUp, Shield, Mail, Users, Clock, Star, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  SwitchPlanButton,
  PaymentMethodSection,
  AdditionalEndpointsManager,
  ChargeHistorySection,
} from './PlanManager';

export const metadata = { title: 'Billing & Subscription Plans | Liable Alerts' };

const VALID_PLAN_ORDER = ['starter', 'pro', 'business'];

// Fallback plan data — shown when DB fetch fails so UI always renders
const FALLBACK_PLANS = [
  { code: 'starter', name: 'Starter', priceCents: 1900, maxActiveEndpoints: 1, stripePriceId: 'price_1UDETm33lejKAXgDyjyOMrsY' },
  { code: 'pro', name: 'Professional', priceCents: 5900, maxActiveEndpoints: 5, stripePriceId: 'price_1UDETp33lejKAXgDJ3zrLCA1' },
  { code: 'business', name: 'Business', priceCents: 12900, maxActiveEndpoints: 15, stripePriceId: 'price_1UDETr33lejKAXgDfxId7yMe' },
];

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string; session_id?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const { status, session_id } = await searchParams;

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*, company:Company(*)')
    .eq('userId', session.user.id)
    .single();
  if (!membership) return null;

  // If returning from Stripe Checkout, verify and sync subscription immediately
  if (status === 'success' && session_id && isStripeConfigured()) {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
      if (checkoutSession.status === 'complete' && checkoutSession.metadata?.planCode) {
        const planCode = checkoutSession.metadata.planCode;
        const extraEndpoints = parseInt(checkoutSession.metadata.extraEndpoints || '0', 10) || 0;
        const { data: plan } = await supabase.from('SubscriptionPlan').select('*').eq('code', planCode).single();
        if (plan) {
          const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          let cardDetails: any = {};
          if (checkoutSession.customer) {
            try {
              const pms = await stripe.paymentMethods.list({ customer: checkoutSession.customer as string, type: 'card', limit: 1 });
              if (pms.data.length > 0) {
                const c = pms.data[0].card;
                cardDetails = {
                  cardBrand: c?.brand ? c.brand.charAt(0).toUpperCase() + c.brand.slice(1) : null,
                  cardLast4: c?.last4 || null,
                  cardExpMonth: c?.exp_month || null,
                  cardExpYear: c?.exp_year || null,
                  billingEmail: pms.data[0].billing_details?.email || checkoutSession.customer_details?.email || null,
                };
              }
            } catch (err) {}
          }
          const { data: existingSub } = await supabase
            .from('CompanySubscription')
            .select('id')
            .eq('companyId', membership.companyId)
            .single();

          const subPayload = {
            planId: plan.id,
            status: 'ACTIVE',
            stripeSubscriptionId: checkoutSession.subscription as string || checkoutSession.id,
            stripeCustomerId: (checkoutSession.customer as string) || undefined,
            extraEndpoints,
            currentPeriodEnd,
            ...cardDetails,
          };

          if (existingSub?.id) {
            await supabase
              .from('CompanySubscription')
              .update(subPayload)
              .eq('id', existingSub.id);
          } else {
            await supabase
              .from('CompanySubscription')
              .insert({
                companyId: membership.companyId,
                ...subPayload,
              });
          }

          // Record in-app billing invoice if not already recorded
          const invoiceId = (checkoutSession.invoice as string) || checkoutSession.id;
          const { data: existingInvoice } = await supabase
            .from('BillingInvoice')
            .select('id')
            .eq('companyId', membership.companyId)
            .eq('stripeInvoiceId', invoiceId)
            .single();

          if (!existingInvoice?.id) {
            const totalAmount = checkoutSession.amount_total || (plan.priceCents + extraEndpoints * 1200);
            await supabase
              .from('BillingInvoice')
              .insert({
                id: nanoid(),
                companyId: membership.companyId,
                stripeInvoiceId: invoiceId,
                invoiceNumber: `INV-SUB-${nanoid(6).toUpperCase()}`,
                amountCents: totalAmount,
                currency: checkoutSession.currency || 'usd',
                status: 'paid',
                description: `Subscription to ${plan.name} Plan (${plan.maxActiveEndpoints} endpoints)${extraEndpoints > 0 ? ` + ${extraEndpoints} Extra Endpoint(s)` : ''}`,
                cardBrand: cardDetails.cardBrand || 'Card',
                cardLast4: cardDetails.cardLast4 || '••••',
                pdfUrl: null,
                createdAt: new Date().toISOString(),
              });
          }
        }
      }
    } catch (err) {
      console.warn('[Billing Page] Error verifying session_id:', err);
    }
  }

  // Run all queries in parallel to reduce DB connections
  const [
    { data: subscription },
    { count: activeCount },
    { data: dbPlansData }
  ] = await Promise.all([
    supabase.from('CompanySubscription').select('*, plan:SubscriptionPlan(*)').eq('companyId', membership.companyId).single(),
    supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }).eq('companyId', membership.companyId).eq('status', 'ACTIVE'),
    supabase.from('SubscriptionPlan').select('*').order('priceCents', { ascending: true })
  ]);
  
  // Use DB plans if available, otherwise fall back to hardcoded plans.
  // Strictly filter to customer tiers (Starter, Professional, Business) and sort in proper ascending sequence.
  const rawPlans = (dbPlansData || [])
    .filter((p: any) => VALID_PLAN_ORDER.includes(p.code))
    .sort((a: any, b: any) => VALID_PLAN_ORDER.indexOf(a.code) - VALID_PLAN_ORDER.indexOf(b.code));
  const dbPlans = rawPlans.length > 0 ? rawPlans : FALLBACK_PLANS;

  const currentPlanCode = subscription?.plan?.code;
  const baseMax = subscription?.plan?.maxActiveEndpoints ?? 1;
  const extraEndpoints = subscription?.extraEndpoints ?? 0;
  const totalMaxEndpoints = baseMax + extraEndpoints;
  const currentActive = activeCount || 0;
  const usagePct = subscription ? Math.min((currentActive / totalMaxEndpoints) * 100, 100) : 0;
  const isOverLimit = currentActive > totalMaxEndpoints;

  const getFeatures = (code: string, max: number) => {
    if (code === 'starter') return [`${max} Active Email Endpoint`, '100 SMS messages/mo', 'Up to 10 SMS recipients per endpoint', 'Full Delivery Logs & Audit Trails'];
    if (code === 'pro') return [`Up to ${max} Active Email Endpoints`, '100 SMS messages/mo per endpoint', 'Up to 10 SMS recipients per endpoint', 'Full Delivery Logs & Priority Support'];
    if (code === 'business') return [`Up to ${max} Active Email Endpoints`, '100 SMS messages/mo per endpoint', 'Up to 10 SMS recipients per endpoint', '24/7 Dedicated Support & Custom Domains'];
    return [`${max}+ Custom Active Email Endpoints`, 'Custom SMS volume', 'Unlimited recipients', 'Enterprise SLA & Compliance'];
  };

  const PLANS = dbPlans.map((p: any) => ({
    ...p,
    features: getFeatures(p.code, p.maxActiveEndpoints),
    recommended: p.code === 'pro'
  }));

  const initialCard = subscription?.cardLast4 ? {
    brand: subscription.cardBrand || 'Card',
    last4: subscription.cardLast4,
    expMonth: subscription.cardExpMonth,
    expYear: subscription.cardExpYear,
    cardholderName: '',
    billingEmail: subscription.billingEmail || '',
  } : null;

  return (
    <div className="space-y-8 sm:space-y-10 animate-fadeIn max-w-5xl py-4 sm:py-6">
      {/* Success/Cancel Banners */}
      {(status === 'success' || status === 'updated') && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900 text-sm">Subscription Updated Successfully!</h3>
            <p className="text-green-700 text-xs sm:text-sm mt-1">Your subscription plan and endpoint allowance have been updated and are live across your workspace.</p>
          </div>
        </div>
      )}
      {status === 'cancelled' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 animate-fadeIn shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">Action Cancelled</h3>
            <p className="text-amber-700 text-xs sm:text-sm mt-1">Your subscription plan remains unchanged.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-[32px] font-bold text-ink-black leading-tight">Billing & Payment Type</h1>
        <p className="text-smoke mt-1.5 text-sm sm:text-base tracking-[-0.32px] leading-relaxed">
          Manage your subscription tier, credit card on file, additional endpoints, and view charge history
        </p>
      </div>

      {/* Quota Alert if Over Limit */}
      {isOverLimit && (
        <div className="p-4 sm:p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 sm:gap-4">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 text-sm sm:text-base">Active Account Limit Exceeded</h3>
            <p className="text-red-700 text-xs sm:text-sm mt-1 leading-relaxed">
              Your company has <strong>{currentActive}</strong> active email accounts, which exceeds your current capacity of <strong>{totalMaxEndpoints}</strong>. Add additional endpoints below for $12/mo or upgrade your plan.
            </p>
          </div>
        </div>
      )}

      {/* Free Trial Expiry Banner */}
      {subscription?.status === 'TRIALING' && subscription?.currentPeriodEnd && (() => {
        const trialEnd = new Date(subscription.currentPeriodEnd);
        const now = new Date();
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isExpiringSoon = daysLeft <= 3;
        const isExpired = daysLeft <= 0;

        if (isExpired) {
          return (
            <div className="p-4 sm:p-5 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3 sm:gap-4 animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-sm sm:text-base">Free Trial Has Ended</h3>
                <p className="text-red-700 text-xs sm:text-sm mt-1 leading-relaxed">
                  Your free trial ended on <strong>{trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>. Upgrade now to keep your alerts running.
                </p>
              </div>
              <Link href="#plans" className="flex-shrink-0 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap">
                Upgrade Now
              </Link>
            </div>
          );
        }

        return (
          <div className={`p-4 sm:p-5 rounded-2xl flex items-start gap-3 sm:gap-4 border-2 animate-fadeIn ${isExpiringSoon ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
            <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isExpiringSoon ? 'text-amber-600' : 'text-blue-600'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold text-sm sm:text-base ${isExpiringSoon ? 'text-amber-900' : 'text-blue-900'}`}>
                  {isExpiringSoon ? `⚠️ Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!` : `Free Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}
                </h3>
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed ${isExpiringSoon ? 'text-amber-700' : 'text-blue-700'}`}>
                Your trial expires on <strong>{trialEnd.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
                Upgrade anytime to unlock all features and keep your alerts running.
              </p>
            </div>
            {isExpiringSoon && (
              <Link href="#plans" className="flex-shrink-0 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors whitespace-nowrap">
                Upgrade Now
              </Link>
            )}
          </div>
        );
      })()}

      {/* 1. Current Plan & Quota Card */}
      <Card className="border-signal-blue/15 bg-signal-blue/5 shadow-subtle">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-signal-blue rounded-full flex items-center justify-center shadow-subtle-5 flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-smoke uppercase tracking-wider">Active Subscription Tier</p>
                  <h2 className="text-xl sm:text-[24px] font-semibold text-ink-black tracking-[-0.48px] leading-tight">
                    {subscription?.plan?.name ?? 'Starter'} Plan
                  </h2>
                </div>
              </div>

              {subscription?.status === 'TRIALING' && subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-2 mt-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg w-fit">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Trial ends: <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                </div>
              )}
            </div>
            <div className="self-start sm:self-auto">
              <Badge variant={
                subscription?.status === 'ACTIVE' ? 'success' :
                subscription?.status === 'TRIALING' ? 'warning' :
                'danger'
              }>
                {subscription?.status ?? 'ACTIVE'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2 tracking-[-0.28px]">
                <span className="font-medium text-graphite">Total Active Email Accounts</span>
                <span className="font-bold text-ink-black">{currentActive} / {totalMaxEndpoints}</span>
              </div>
              <div className="w-full bg-ash-mist/80 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-600' : usagePct >= 90 ? 'bg-amber-500' : 'bg-signal-blue'}`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <p className="text-[12px] text-smoke mt-2">
                {baseMax} included with {subscription?.plan?.name || 'Starter'} plan {extraEndpoints > 0 && `• +${extraEndpoints} purchased endpoints`}
              </p>
            </div>
            
            <div className="space-y-2.5 border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-6 border-ash-mist/40">
              <div className="flex items-center gap-2 text-sm tracking-[-0.28px]">
                <Mail className="w-4 h-4 text-signal-blue flex-shrink-0" />
                <span className="text-graphite">Independent Endpoint Configuration</span>
              </div>
              <div className="flex items-center gap-2 text-sm tracking-[-0.28px]">
                <Clock className="w-4 h-4 text-signal-blue flex-shrink-0" />
                <span className="text-graphite">Real-time SMS Forwarding & Delivery Logs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. In-App Payment Method (Credit Card on File) */}
      <PaymentMethodSection initialCard={initialCard} />

      {/* 3. Additional Single Endpoints ($12/mo each) */}
      <AdditionalEndpointsManager
        initialExtra={extraEndpoints}
        basePlanMax={baseMax}
        planName={subscription?.plan?.name || 'Starter'}
      />

      {/* 4. Pricing Plans Grid */}
      <div id="plans" className="space-y-6 pt-2">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-[28px] font-bold text-ink-black leading-tight">Subscription Plans</h2>
          <p className="text-smoke mt-1 text-sm sm:text-base tracking-[-0.32px]">
            Switch plan anytime — switch takes effect instantly
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan: any) => {
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
      </div>

      {/* 5. In-App Billing & Charge History Record */}
      <ChargeHistorySection />
    </div>
  );
}
