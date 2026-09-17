import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { getSubscriptionUsage } from '@/services/endpointService';
import {
  CreditCard, Zap, CheckCircle2, ArrowUpCircle, TrendingUp, Shield,
  Mail, Users, Clock, Star, AlertTriangle, Building, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  SitePricingCalculator,
  AdditionalEndpointsManager,
  SmsUsageOverview,
  PaymentMethodSection,
  ChargeHistorySection,
} from './PlanManager';

export const metadata = { title: 'Billing & Site Pricing Plans | Liable Alerts' };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string }>;
}) {
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
      if (checkoutSession.status === 'complete' && checkoutSession.metadata) {
        const planCode = checkoutSession.metadata.planCode || 'site_starter';
        const activeSites = parseInt(checkoutSession.metadata.activeSites || '1', 10) || 1;
        const extraEndpoints = parseInt(checkoutSession.metadata.extraEndpoints || '0', 10) || 0;

        const { data: plan } = await supabase.from('SubscriptionPlan').select('*').eq('code', planCode).single();
        if (plan) {
          const currentPeriodStart = new Date().toISOString();
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
            activeSites,
            extraEndpoints,
            currentPeriodStart,
            currentPeriodEnd,
            ...cardDetails,
          };

          if (existingSub?.id) {
            await supabase.from('CompanySubscription').update(subPayload).eq('id', existingSub.id);
          } else {
            await supabase.from('CompanySubscription').insert({ companyId: membership.companyId, ...subPayload });
          }

          // Record invoice if not present
          const invoiceId = (checkoutSession.invoice as string) || checkoutSession.id;
          const { data: existingInvoice } = await supabase
            .from('BillingInvoice')
            .select('id')
            .eq('companyId', membership.companyId)
            .eq('stripeInvoiceId', invoiceId)
            .single();

          if (!existingInvoice?.id) {
            const totalAmount = checkoutSession.amount_total || (plan.priceCents * activeSites + extraEndpoints * 1500);
            await supabase.from('BillingInvoice').insert({
              id: nanoid(),
              companyId: membership.companyId,
              stripeInvoiceId: invoiceId,
              invoiceNumber: `INV-SUB-${nanoid(6).toUpperCase()}`,
              amountCents: totalAmount,
              currency: checkoutSession.currency || 'usd',
              status: 'paid',
              description: `Subscription: ${activeSites} Active Site(s) (${plan.name})${extraEndpoints > 0 ? ` + ${extraEndpoints} Additional Endpoint(s)` : ''}`,
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

  // Load comprehensive usage, site quota, and SMS metrics
  const usage = await getSubscriptionUsage(membership.companyId);
  const subscription = usage.subscription;

  const initialCard = subscription?.cardLast4 ? {
    brand: subscription.cardBrand || 'Card',
    last4: subscription.cardLast4,
    expMonth: subscription.cardExpMonth,
    expYear: subscription.cardExpYear,
    cardholderName: '',
    billingEmail: subscription.billingEmail || '',
  } : null;

  const endpointUsagePct = Math.min(100, Math.round((usage.activeCount / Math.max(1, usage.maxActiveEndpoints)) * 100));
  const smsUsagePct = Math.min(100, Math.round((usage.totalCreditsUsed / Math.max(1, usage.includedCredits)) * 100));

  return (
    <div className="space-y-8 sm:space-y-10 animate-fadeIn max-w-5xl py-4 sm:py-6">
      {/* Success/Cancel Banners */}
      {(status === 'success' || status === 'updated') && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900 text-sm">Subscription Active &amp; Live!</h3>
            <p className="text-green-700 text-xs sm:text-sm mt-1">
              Your site subscription and endpoint allowances are active and synced with Stripe.
            </p>
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
        <h1 className="text-2xl sm:text-[32px] font-bold text-ink-black leading-tight">Billing &amp; Subscription Plans</h1>
        <p className="text-smoke mt-1.5 text-sm sm:text-base tracking-[-0.32px] leading-relaxed">
          Manage your per-site volume subscription, additional endpoints, SMS credits, payment card, and view invoices.
        </p>
      </div>

      {/* Quota Alert if Over Limit */}
      {usage.isOverLimit && (
        <div className="p-4 sm:p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 sm:gap-4">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 text-sm sm:text-base">Active Account Limit Exceeded</h3>
            <p className="text-red-700 text-xs sm:text-sm mt-1 leading-relaxed">
              Your company has <strong>{usage.activeCount}</strong> active email accounts, which exceeds your capacity of <strong>{usage.maxActiveEndpoints}</strong>. Add additional endpoints below for $15/mo or increase your sites plan.
            </p>
          </div>
        </div>
      )}

      {/* Free Trial Banner */}
      {usage.isTrial && subscription?.currentPeriodEnd && (() => {
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
                <h3 className="font-bold text-red-900 text-sm sm:text-base">Seven-Day Free Trial Has Ended</h3>
                <p className="text-red-700 text-xs sm:text-sm mt-1 leading-relaxed">
                  Your trial ended on <strong>{trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>. Paid subscription is required to keep SMS alarm delivery running.
                </p>
              </div>
              <Link href="#plans" className="flex-shrink-0 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap">
                Subscribe Now
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
                  {isExpiringSoon ? `⚠️ Free Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!` : `Seven-Day Free Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}
                </h3>
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed ${isExpiringSoon ? 'text-amber-700' : 'text-blue-700'}`}>
                Includes 1 site, 1 dedicated endpoint, up to 3 recipients, and 25 SMS delivery credits. Paid subscription is required after seven days.
              </p>
            </div>
            <Link href="#plans" className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap">
              Choose Plan
            </Link>
          </div>
        );
      })()}

      {/* 1. Current Subscription & Quota Summary Card */}
      <Card className="border-signal-blue/20 bg-signal-blue/5 shadow-subtle">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-signal-blue rounded-full flex items-center justify-center shadow-subtle-5 flex-shrink-0">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-smoke uppercase tracking-wider">Current Subscription Plan</p>
                  <h2 className="text-xl sm:text-[24px] font-bold text-ink-black tracking-[-0.48px] leading-tight">
                    {usage.isTrial ? 'Seven-Day Free Trial' : `${subscription?.plan?.name || 'Starter'} Plan`}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-blue-900 bg-blue-100/70 px-2.5 py-1 rounded-lg">
                  {usage.activeSitesQuota} Active Site Quota
                </span>
                {usage.extraEndpoints > 0 && (
                  <span className="text-xs font-bold text-indigo-900 bg-indigo-100/70 px-2.5 py-1 rounded-lg">
                    +{usage.extraEndpoints} Additional Endpoints ($15/mo each)
                  </span>
                )}
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-ash-mist/30">
            {/* Sites Metric */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>Active Physical Sites</span>
                <span className="font-bold text-gray-900">{usage.activeSitesCount} / {usage.activeSitesQuota}</span>
              </div>
              <div className="w-full bg-ash-mist/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-signal-blue transition-all"
                  style={{ width: `${Math.min(100, (usage.activeSitesCount / Math.max(1, usage.activeSitesQuota)) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Each active site includes 1 primary alarm endpoint
              </p>
            </div>

            {/* Endpoints Metric */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>Active Email Accounts</span>
                <span className="font-bold text-gray-900">{usage.activeCount} / {usage.maxActiveEndpoints}</span>
              </div>
              <div className="w-full bg-ash-mist/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usage.isOverLimit ? 'bg-red-600' : 'bg-signal-blue'}`}
                  style={{ width: `${endpointUsagePct}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                {usage.activeSitesQuota} primary + {usage.extraEndpoints} extra ($15/mo each)
              </p>
            </div>

            {/* SMS Credits Metric */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>SMS Credits (Monthly)</span>
                <span className="font-bold text-gray-900">{usage.totalCreditsUsed} / {usage.includedCredits}</span>
              </div>
              <div className="w-full bg-ash-mist/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${smsUsagePct >= 100 ? 'bg-red-600' : smsUsagePct >= 80 ? 'bg-amber-500' : 'bg-green-600'}`}
                  style={{ width: `${smsUsagePct}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                {usage.isTrial ? '25 credits for free trial' : '250 credits included per endpoint'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Interactive Site Pricing Calculator & Tier Selector */}
      <SitePricingCalculator
        currentActiveSites={usage.activeSitesCount}
        currentSubscribedSites={usage.activeSitesQuota}
        currentPlanCode={subscription?.plan?.code}
        isTrial={usage.isTrial}
      />

      {/* 3. Additional Endpoints Manager ($15/mo per endpoint at same site) */}
      <AdditionalEndpointsManager
        initialExtra={usage.extraEndpoints}
        basePlanMax={usage.activeSitesQuota}
        planName={subscription?.plan?.name || 'Site'}
      />

      {/* 4. SMS Delivery Credits & Automatic Overage Management */}
      <SmsUsageOverview
        includedCredits={usage.includedCredits}
        totalCreditsUsed={usage.totalCreditsUsed}
        endpoints={usage.activeEndpoints}
        isTrial={usage.isTrial}
      />

      {/* 5. In-App Payment Method (Credit Card on File) */}
      <PaymentMethodSection initialCard={initialCard} />

      {/* 6. In-App Billing & Charge History Record */}
      <ChargeHistorySection />
    </div>
  );
}
