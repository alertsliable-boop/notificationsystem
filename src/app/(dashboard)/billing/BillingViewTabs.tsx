'use client';

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Zap, CreditCard, Plus, MessageSquare, FileText, Layers, 
  ChevronRight, Shield, CheckCircle2, ArrowRight, Sparkles 
} from 'lucide-react';

export type BillingTabId = 'plans' | 'payment-method' | 'endpoints' | 'sms' | 'invoices' | 'all';

interface BillingViewTabsProps {
  initialTab?: BillingTabId;
  cardLast4?: string | null;
  cardBrand?: string | null;
  planName?: string | null;
  extraEndpoints?: number;
  currentPlanSection: React.ReactNode;
  pricingCalculatorSection: React.ReactNode;
  additionalEndpointsSection: React.ReactNode;
  smsUsageSection: React.ReactNode;
  paymentMethodSection: React.ReactNode;
  invoicesSection: React.ReactNode;
}

function BillingTabsContent({
  initialTab = 'plans',
  cardLast4,
  cardBrand,
  planName,
  extraEndpoints = 0,
  currentPlanSection,
  pricingCalculatorSection,
  additionalEndpointsSection,
  smsUsageSection,
  paymentMethodSection,
  invoicesSection,
}: BillingViewTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read tab from query params if available
  const tabFromQuery = (searchParams.get('tab') as BillingTabId) || initialTab;
  const [activeTab, setActiveTab] = useState<BillingTabId>(tabFromQuery);

  // Sync state if query changes externally
  useEffect(() => {
    const qTab = searchParams.get('tab') as BillingTabId;
    if (qTab && ['plans', 'payment-method', 'endpoints', 'sms', 'invoices', 'all'].includes(qTab)) {
      setActiveTab(qTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: BillingTabId) => {
    setActiveTab(newTab);
    // Smoothly update URL query param without hard page reload
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('tab', newTab);
    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  const tabs: {
    id: BillingTabId;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    badge?: string;
    badgeVariant?: 'blue' | 'green' | 'amber';
  }[] = [
    {
      id: 'plans',
      label: 'Subscription & Sites',
      shortLabel: 'Plans & Sites',
      icon: Zap,
      badge: planName ? `${planName}` : undefined,
      badgeVariant: 'blue',
    },
    {
      id: 'payment-method',
      label: 'Saved Payment Card',
      shortLabel: 'Payment Method',
      icon: CreditCard,
      badge: cardLast4 ? `•••• ${cardLast4}` : 'No card on file',
      badgeVariant: cardLast4 ? 'green' : 'amber',
    },
    {
      id: 'endpoints',
      label: 'Additional Endpoints',
      shortLabel: 'Endpoints',
      icon: Plus,
      badge: extraEndpoints > 0 ? `+${extraEndpoints}` : undefined,
      badgeVariant: 'blue',
    },
    {
      id: 'sms',
      label: 'SMS Delivery & Credits',
      shortLabel: 'SMS Credits',
      icon: MessageSquare,
    },
    {
      id: 'invoices',
      label: 'Invoices & Receipts',
      shortLabel: 'Invoices',
      icon: FileText,
    },
    {
      id: 'all',
      label: 'View All',
      shortLabel: 'View All',
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tab Navigation Bar */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-[13px] transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{tab.shortLabel}</span>

                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeVariant === 'green'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : tab.badgeVariant === 'amber'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panels */}
      <div className="transition-all duration-200">
        {/* 1. Subscription & Sites Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-fadeIn">
            {currentPlanSection}
            {pricingCalculatorSection}

            {/* Quick action banners */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleTabChange('payment-method')}
                className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-blue-300 hover:shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-900">Payment Method on File</h4>
                    <p className="text-[11px] text-gray-500">
                      {cardLast4 ? `Active card ending in •••• ${cardLast4}` : 'No credit card saved yet'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('invoices')}
                className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-blue-300 hover:shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-900">Billing History &amp; Receipts</h4>
                    <p className="text-[11px] text-gray-500">View charge history and download PDF invoices</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* 2. Payment Method Tab */}
        {activeTab === 'payment-method' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Quick summary header */}
            <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Saved Credit Card &amp; Billing Info</h3>
                  <p className="text-xs text-gray-600">
                    Primary payment card charged automatically for your active subscription and endpoint allowances.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-white/80 px-3 py-1.5 rounded-xl border border-blue-200/70 self-start sm:self-auto">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>PCI-DSS Level 1 Secure</span>
              </div>
            </div>

            {paymentMethodSection}

            {/* Quick navigation to other billing areas */}
            <div className="border-t border-gray-200/60 pt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleTabChange('plans')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                ← View Subscription &amp; Sites
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('invoices')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                View Invoices &amp; Charge History →
              </button>
            </div>
          </div>
        )}

        {/* 3. Additional Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="space-y-6 animate-fadeIn">
            {additionalEndpointsSection}

            <div className="border-t border-gray-200/60 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTabChange('plans')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                ← Back to Subscription Plans
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('payment-method')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                Manage Payment Card →
              </button>
            </div>
          </div>
        )}

        {/* 4. SMS Delivery & Credits Tab */}
        {activeTab === 'sms' && (
          <div className="space-y-6 animate-fadeIn">
            {smsUsageSection}

            <div className="border-t border-gray-200/60 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTabChange('plans')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                ← Back to Subscription Plans
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('invoices')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                View Invoices →
              </button>
            </div>
          </div>
        )}

        {/* 5. Invoices & Receipts Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-6 animate-fadeIn">
            {invoicesSection}

            <div className="border-t border-gray-200/60 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTabChange('payment-method')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                ← Update Payment Card
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('plans')}
                className="text-xs text-gray-500 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                View Subscription Plans →
              </button>
            </div>
          </div>
        )}

        {/* 6. View All Tab (Scrollable Single Page) */}
        {activeTab === 'all' && (
          <div className="space-y-8 sm:space-y-10 animate-fadeIn">
            <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900 flex items-center justify-between">
              <span>Showing all billing sections on one page.</span>
              <div className="flex items-center gap-2 font-semibold">
                <button
                  type="button"
                  onClick={() => handleTabChange('payment-method')}
                  className="hover:underline text-blue-700"
                >
                  Jump to Payment Card
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleTabChange('invoices')}
                  className="hover:underline text-blue-700"
                >
                  Jump to Invoices
                </button>
              </div>
            </div>

            {currentPlanSection}
            {pricingCalculatorSection}
            {additionalEndpointsSection}
            {smsUsageSection}
            {paymentMethodSection}
            {invoicesSection}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingViewTabs(props: BillingViewTabsProps) {
  return (
    <Suspense fallback={<div className="py-8 text-center text-xs text-gray-400">Loading billing sections...</div>}>
      <BillingTabsContent {...props} />
    </Suspense>
  );
}
