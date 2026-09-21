'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Loader2, ArrowUpCircle, TrendingUp, CreditCard, Plus, Minus,
  CheckCircle2, Shield, AlertCircle, FileText, Download, X,
  Calendar, DollarSign, Layers, Lock, Sparkles, ExternalLink,
  Building, Sliders, MessageSquare, Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Portal from '@/components/ui/Portal';

interface PlanManagerProps {
  planCode: string;
  planName: string;
  currentPrice: number;
  newPrice: number;
  isCurrent: boolean;
}

// 1. One-Click Instant Switch Plan Button (No blocking modals)
export function SwitchPlanButton({ planCode, planName, currentPrice, newPrice, isCurrent }: PlanManagerProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isUpgrade = currentPrice < newPrice;

  const handleSwitch = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/billing/switch-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || 'Failed to switch subscription plan');
        setLoading(false);
        return;
      }

      // If Stripe Checkout URL was returned, redirect directly to Stripe!
      if (json.url) {
        window.location.href = json.url;
        return;
      }

      // Success
      router.refresh();
      window.location.href = '/billing?status=updated';
    } catch (err: any) {
      alert(err.message || 'An error occurred while switching plans');
      setLoading(false);
    }
  };

  if (isCurrent) {
    return (
      <Button variant="outline" disabled className="w-full">
        Current Active Plan
      </Button>
    );
  }

  return (
    <Button
      variant={isUpgrade ? 'primary' : 'outline'}
      className="w-full"
      onClick={handleSwitch}
      disabled={loading}
      icon={
        loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isUpgrade ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <ArrowUpCircle className="w-4 h-4" />
        )
      }
    >
      {loading ? 'Processing...' : isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan'}
    </Button>
  );
}

// 2. In-App Payment Method & Card Details Manager (Stripe Elements + SetupIntent Flow)
const stripePromiseMap: Record<string, Promise<Stripe | null>> = {};
function getStripePromise(key?: string | null) {
  const publishableKey = key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return null;
  if (!stripePromiseMap[publishableKey]) {
    stripePromiseMap[publishableKey] = loadStripe(publishableKey);
  }
  return stripePromiseMap[publishableKey];
}

function StripeCardForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: (card: any) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card input field is loading. Please try again in a moment.');
      setSaving(false);
      return;
    }

    try {
      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName.trim() || undefined,
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment card confirmation failed.');
        setSaving(false);
        return;
      }

      if (!setupIntent?.payment_method) {
        setError('Card setup could not be completed.');
        setSaving(false);
        return;
      }

      const pmId = typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;

      const res = await fetch('/api/billing/payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save card on server');
        setSaving(false);
        return;
      }

      onSuccess(json.card);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving your card');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
          Cardholder Name
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Name on card"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Card Details *</span>
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
            <Lock className="w-3 h-3" /> PCI DSS Compliant (Stripe Elements)
          </span>
        </label>
        <div className="border border-gray-200 bg-white rounded-xl p-3.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '14px',
                  color: '#111827',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving || !stripe}
          icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        >
          {saving ? 'Saving Securely...' : 'Save Payment Method'}
        </Button>
      </div>
    </form>
  );
}

export function PaymentMethodSection({ initialCard }: { initialCard?: any }) {
  const [card, setCard] = useState<any>(initialCard || null);
  const [loading, setLoading] = useState(!initialCard);
  const [showModal, setShowModal] = useState(false);

  // Setup state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
  );
  const [initializingSetup, setInitializingSetup] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [hostedLoading, setHostedLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCard = async () => {
    try {
      const res = await fetch('/api/billing/payment-method');
      const json = await res.json();
      if (json.card) {
        setCard(json.card);
      }
    } catch (err) {
      console.error('Failed to load card:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialCard) fetchCard();
  }, [initialCard]);

  // Card brand detection helper
  const getBrandIcon = (brandName?: string) => {
    const b = (brandName || '').toLowerCase();
    if (b.includes('visa')) return 'VISA';
    if (b.includes('master')) return 'MC';
    if (b.includes('amex')) return 'AMEX';
    if (b.includes('discover')) return 'DISC';
    return 'CARD';
  };

  const initSetupIntent = async () => {
    setInitializingSetup(true);
    setSetupError('');
    try {
      const res = await fetch('/api/billing/setup-intent', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setSetupError(json.error || 'Failed to initialize payment setup');
        return;
      }
      setClientSecret(json.clientSecret);
      if (json.publishableKey) {
        setPublishableKey(json.publishableKey);
      }
    } catch (err: any) {
      setSetupError(err.message || 'Error connecting to payment provider');
    } finally {
      setInitializingSetup(false);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setSetupError('');
    setSuccessMsg('');
    initSetupIntent();
  };

  const handleHostedSetup = async () => {
    setHostedLoading(true);
    setSetupError('');
    try {
      const res = await fetch('/api/billing/create-setup-session', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setSetupError(json.error || 'Could not launch Stripe hosted setup');
        setHostedLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch (err: any) {
      setSetupError(err.message || 'Error launching Stripe checkout');
      setHostedLoading(false);
    }
  };

  const handleCardSavedSuccess = (newCard: any) => {
    setCard(newCard);
    setSuccessMsg('Payment method securely saved and verified!');
    setTimeout(() => {
      setShowModal(false);
      setSuccessMsg('');
      setClientSecret(null);
    }, 1500);
  };

  const stripePromise = getStripePromise(publishableKey);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-[17px] font-bold text-gray-900">Payment Method</h3>
          </div>
          <p className="text-[13px] text-gray-500">
            Credit card used for your subscription plan and additional endpoints
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition border border-blue-200 self-start sm:self-auto cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          {card ? 'Change Payment Method' : 'Add Credit Card'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : card ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50/40 border border-gray-200">
          <div className="flex items-center gap-4">
            {/* Card Brand Badge */}
            <div className="w-14 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center font-extrabold text-[12px] tracking-wider shadow-xs flex-shrink-0">
              {getBrandIcon(card.brand)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[14px] font-bold text-gray-900">
                  •••• •••• •••• {card.last4}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Default
                </span>
              </div>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Expires {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
                {card.cardholderName ? ` • ${card.cardholderName}` : ''}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Status</span>
            <span className="text-[13px] font-bold text-gray-700">Active & Verified</span>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-dashed border-gray-200 text-center space-y-2">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-[13px] font-semibold text-gray-700">No credit card on file</p>
          <p className="text-[12px] text-gray-400 max-w-sm mx-auto">
            Add a credit card securely here to ensure uninterrupted notification delivery and access to additional endpoints.
          </p>
        </div>
      )}

      {/* PCI DSS Compliant Stripe Elements Modal */}
      {showModal && (
        <Portal>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !hostedLoading) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-gray-900">
                      {card ? 'Update Payment Method' : 'Add Credit Card'}
                    </h3>
                    <p className="text-[11px] text-gray-400">Card details are securely encrypted by Stripe</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={hostedLoading}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition cursor-pointer disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {setupError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-red-900">Unable to launch payment page</p>
                    <p className="text-[11px] text-red-700 leading-relaxed">{setupError}</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {initializingSetup ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-[13px] text-gray-500 font-medium">Connecting securely to Stripe...</p>
                </div>
              ) : clientSecret && publishableKey && stripePromise ? (
                <div className="space-y-4">
                  <Elements stripe={stripePromise}>
                    <StripeCardForm
                      clientSecret={clientSecret}
                      onSuccess={handleCardSavedSuccess}
                      onCancel={() => setShowModal(false)}
                    />
                  </Elements>

                  <div className="border-t border-gray-100 pt-3 text-center">
                    <button
                      type="button"
                      onClick={handleHostedSetup}
                      disabled={hostedLoading}
                      className="text-[12px] text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      {hostedLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                      Or update on Stripe Hosted Checkout →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-2xl text-blue-950 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
                      <Shield className="w-4.5 h-4.5 text-blue-600" />
                      <span>Secure Stripe-Hosted Card Setup</span>
                    </div>
                    <p className="text-xs text-blue-800/90 leading-relaxed">
                      You will be redirected to Stripe&apos;s official, PCI-compliant hosted page to securely save your card details. Your card will be attached to your workspace subscription automatically.
                    </p>
                    <div className="pt-2.5 border-t border-blue-100/80 grid grid-cols-2 gap-2 text-[11px] text-blue-800 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>256-bit TLS Encryption</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>PCI DSS Level 1 Certified</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>Direct Stripe Sync</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>Zero Card Data On Server</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      disabled={hostedLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleHostedSetup}
                      disabled={hostedLoading}
                      icon={hostedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    >
                      {hostedLoading ? 'Redirecting to Stripe...' : 'Open Stripe Hosted Checkout →'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

// 3. Purchase Single Endpoints Manager ($12/mo each with any plan)
export function AdditionalEndpointsManager({
  initialExtra,
  basePlanMax,
  planName,
}: {
  initialExtra: number;
  basePlanMax: number;
  planName: string;
}) {
  const [extraCount, setExtraCount] = useState<number>(initialExtra || 0);
  const [selectedCount, setSelectedCount] = useState<number>(initialExtra || 0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  // Purchase Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{ hasPaymentMethod: boolean; card: any } | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const handleOpenConfirmModal = async () => {
    setShowConfirmModal(true);
    setLoadingPayment(true);
    setConfirmError('');
    try {
      const res = await fetch('/api/billing/payment-method');
      const json = await res.json();
      setPaymentInfo(json);
    } catch (err) {
      console.error('Failed to load payment info:', err);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleUpdateCapacity = async (newCount: number) => {
    setSaving(true);
    setMsg('');

    try {
      const res = await fetch('/api/billing/extra-endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: newCount, action: 'set' }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to update additional endpoints');
        setSaving(false);
        return;
      }

      setExtraCount(json.extraEndpoints);
      setSelectedCount(json.extraEndpoints);
      setMsg(json.message || 'Endpoint capacity updated!');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error updating endpoints');
    } finally {
      setSaving(false);
    }
  };

  const totalCapacity = basePlanMax + selectedCount;
  const monthlyCost = selectedCount * 15;
  const hasChanged = selectedCount !== extraCount;

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              +1
            </div>
            <h3 className="text-[17px] font-bold text-gray-900">Additional Endpoints (Same Site)</h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              $15.00 / month each
            </span>
          </div>
          <p className="text-[13px] text-gray-500">
            Add endpoints for multiple systems located at the same physical site (e.g., Main BMS, Chiller plant, Garage CO, Refrigeration). Each includes an extra 250 SMS credits/mo and up to 10 recipients.
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-gray-50/70 p-4 rounded-xl border border-gray-200">
        {/* Counter controls */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Extra Endpoints
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedCount(Math.max(0, selectedCount - 1))}
              disabled={selectedCount <= 0 || saving}
              className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center font-bold disabled:opacity-40 transition"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="font-mono text-xl font-bold text-gray-900 w-8 text-center">
              {selectedCount}
            </span>

            <button
              type="button"
              onClick={() => setSelectedCount(selectedCount + 1)}
              disabled={saving}
              className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center font-bold transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Capacity Breakdown */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Total Endpoint Capacity
          </span>
          <p className="text-[14px] font-bold text-gray-900">
            {totalCapacity} Total Endpoints
          </p>
          <p className="text-[11px] text-gray-500">
            {basePlanMax} included with active sites + {selectedCount} purchased ($15/mo each)
          </p>
        </div>

        {/* Action Button & Cost Preview */}
        <div className="flex flex-col items-start md:items-end justify-center space-y-1">
          <div className="text-right">
            <span className="text-sm font-bold text-blue-700">
              +${monthlyCost.toFixed(2)}/mo
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenConfirmModal}
            disabled={saving || !hasChanged}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              hasChanged
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-400 cursor-default'
            }`}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {hasChanged ? `Apply Capacity (+${selectedCount} endpoints)` : 'Current Capacity Active'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Portal>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !saving) setShowConfirmModal(false);
            }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-[17px] text-gray-900">Confirm Additional Endpoints Purchase</h3>
                    <p className="text-xs text-gray-500">Review charge details and billing proration</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {confirmError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {confirmError}
                </div>
              )}

              {/* Summary Box */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">New Total Capacity:</span>
                  <span className="font-bold text-gray-900">{totalCapacity} Endpoints ({basePlanMax} sites + {selectedCount} extra)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Capacity Adjustment:</span>
                  <span className="font-bold text-blue-600">
                    {selectedCount - extraCount > 0 ? `+${selectedCount - extraCount}` : `${selectedCount - extraCount}`} Endpoints ($15.00/mo each)
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-900">New Monthly Cost:</span>
                  <span className="text-sm font-bold text-blue-700">+${monthlyCost.toFixed(2)}/mo</span>
                </div>
              </div>

              {/* Proration Explanation */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  How Stripe Billing &amp; Proration Works:
                </p>
                <p className="text-[11.5px] leading-relaxed text-blue-800">
                  {selectedCount > extraCount ? (
                    <>You will be charged a <strong>prorated amount immediately</strong> for the remainder of your current monthly billing period. Subsequent renewals will bill the full updated rate (${monthlyCost.toFixed(2)}/mo).</>
                  ) : (
                    <>Unused days for removed endpoints will be <strong>credited to your account balance</strong> and automatically deducted from your next monthly renewal bill.</>
                  )}
                </p>
              </div>

              {/* Payment Method Status */}
              <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Payment Method</span>
                {loadingPayment ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying payment method...
                  </div>
                ) : paymentInfo?.hasPaymentMethod ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono text-[10px] rounded font-bold">
                        {paymentInfo.card.brand}
                      </span>
                      <span>•••• •••• •••• {paymentInfo.card.last4}</span>
                      <span className="text-gray-400 font-normal">(Exp {paymentInfo.card.expMonth}/{paymentInfo.card.expYear})</span>
                    </div>
                    <span className="text-[11px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      Ready to charge
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      No credit card on file. Please add your payment method in the Payment Method section below to complete this purchase.
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCount > extraCount && !paymentInfo?.hasPaymentMethod) {
                      setConfirmError('Please add a credit card in the Payment Method section below before confirming.');
                      return;
                    }
                    setShowConfirmModal(false);
                    handleUpdateCapacity(selectedCount);
                  }}
                  disabled={saving || (selectedCount > extraCount && !paymentInfo?.hasPaymentMethod)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                  Confirm &amp; Charge Capacity
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

// 4. In-App Charge History & Receipts Record Table
export function ChargeHistorySection() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing/invoices')
      .then((res) => res.json())
      .then((json) => {
        setInvoices(json.invoices || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load charge history:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-0">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-gray-700" />
            <h3 className="text-[17px] font-bold text-gray-900">Billing & Charge History Record</h3>
          </div>
          <p className="text-[13px] text-gray-500">
            Track all transactions, monthly subscription charges, and download payment receipts
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-12 text-center text-gray-400 space-y-2">
          <FileText className="w-8 h-8 mx-auto text-gray-300" />
          <p className="text-sm font-semibold text-gray-600">No charge records found</p>
          <p className="text-xs text-gray-400">Transactions will be listed here after your billing cycle charges.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[13px]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">
                    {new Date(inv.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium max-w-xs truncate">
                    {inv.description}
                  </td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap font-mono text-xs">
                    {inv.cardBrand} •••• {inv.cardLast4}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                    ${(inv.amountCents / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium">Receipt on file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 5. Active Site Volume Tier Calculator & Subscription Plan Switcher
export function SitePricingCalculator({
  currentActiveSites,
  currentSubscribedSites,
  currentPlanCode,
  isTrial,
}: {
  currentActiveSites: number;
  currentSubscribedSites: number;
  currentPlanCode?: string;
  isTrial?: boolean;
}) {
  const [siteCount, setSiteCount] = useState<number>(
    Math.max(1, currentSubscribedSites || currentActiveSites || 1)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const getTierInfo = (sites: number) => {
    if (sites >= 50) return { rate: 34, code: 'site_enterprise', name: 'Enterprise', range: '50+ sites' };
    if (sites >= 25) return { rate: 39, code: 'site_pro_plus', name: 'Professional Plus', range: '25–49 sites' };
    if (sites >= 10) return { rate: 44, code: 'site_pro', name: 'Professional', range: '10–24 sites' };
    return { rate: 49, code: 'site_starter', name: 'Starter', range: '1–9 sites' };
  };

  const currentTier = getTierInfo(siteCount);
  const monthlyTotal = siteCount * currentTier.rate;
  const includedCredits = siteCount * 250;

  const TIERS = [
    { code: 'site_starter', name: 'Starter', range: '1–9 sites', rate: 49, desc: 'For growing facilities & single-site operations' },
    { code: 'site_pro', name: 'Professional', range: '10–24 sites', rate: 44, desc: 'For regional property management & multiple sites' },
    { code: 'site_pro_plus', name: 'Professional Plus', range: '25–49 sites', rate: 39, desc: 'For campus portfolios & facility managers' },
    { code: 'site_enterprise', name: 'Enterprise', range: '50+ sites', rate: 34, desc: 'For enterprise multi-property infrastructure' },
  ];

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode: currentTier.code,
          activeSites: siteCount,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to initialize subscription checkout');
        setLoading(false);
        return;
      }

      if (json.url) {
        window.location.href = json.url;
      } else {
        router.refresh();
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing request');
      setLoading(false);
    }
  };

  return (
    <div id="plans" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
            Per-Site Volume Tiering
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Liable Alerts Per-Site Pricing Plans
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          Charge per active physical site. The applicable volume rate is determined by your account’s total number of active sites and applies to all sites. Each site includes 1 dedicated alarm email address, up to 10 recipients, and 250 SMS credits/mo.
        </p>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => {
          const isSelectedTier = currentTier.code === tier.code;
          return (
            <div
              key={tier.code}
              onClick={() => {
                if (tier.code === 'site_starter' && siteCount > 9) setSiteCount(5);
                else if (tier.code === 'site_pro' && (siteCount < 10 || siteCount > 24)) setSiteCount(15);
                else if (tier.code === 'site_pro_plus' && (siteCount < 25 || siteCount > 49)) setSiteCount(30);
                else if (tier.code === 'site_enterprise' && siteCount < 50) setSiteCount(50);
              }}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelectedTier
                  ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/10'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
                    {tier.name}
                  </span>
                  {isSelectedTier && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-extrabold text-gray-900">${tier.rate}</span>
                  <span className="text-xs text-gray-500 font-medium">/ site / mo</span>
                </div>
                <span className="inline-block text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md mb-2">
                  {tier.range}
                </span>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  {tier.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-[11px] text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>1 Endpoint included / site</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>250 SMS credits / site</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Up to 10 recipients / endpoint</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Site Counter & Slider */}
      <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Calculate Your Plan: Number of Active Sites
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select or type the total number of customer properties or buildings you manage
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSiteCount(Math.max(1, siteCount - 1))}
              className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center font-bold text-lg shadow-xs transition"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center px-4 py-2 bg-white border-2 border-blue-500 rounded-xl min-w-[90px]">
              <span className="font-mono text-xl font-bold text-gray-900">{siteCount}</span>
              <span className="text-xs text-gray-500 font-medium ml-1.5">sites</span>
            </div>

            <button
              type="button"
              onClick={() => setSiteCount(siteCount + 1)}
              className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center font-bold text-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min={1}
            max={60}
            value={siteCount}
            onChange={(e) => setSiteCount(parseInt(e.target.value, 10))}
            className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-gray-400 font-semibold px-1">
            <span>1 Site ($49/ea)</span>
            <span>10 Sites ($44/ea)</span>
            <span>25 Sites ($39/ea)</span>
            <span>50+ Sites ($34/ea)</span>
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-gray-400 mr-1">Quick Select:</span>
          {[1, 5, 10, 20, 25, 40, 50, 100].map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => setSiteCount(qty)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                siteCount === qty
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {qty} {qty === 1 ? 'Site' : 'Sites'}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Summary & Checkout Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold">
              {currentTier.name} Plan Tier ({currentTier.range})
            </span>
            <span className="text-xs text-blue-200">
              • ${currentTier.rate} per site
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight">${monthlyTotal}</span>
            <span className="text-sm text-blue-200 font-medium">/ month total</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200/90 pt-1">
            <span>✓ <strong>{siteCount}</strong> Primary Endpoints Included</span>
            <span>✓ <strong>{includedCredits.toLocaleString()}</strong> SMS Credits / Month</span>
            <span>✓ Up to 10 SMS Recipients each</span>
          </div>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-2 flex-shrink-0">
          {error && (
            <span className="text-red-300 text-xs font-medium max-w-xs">{error}</span>
          )}
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {isTrial ? `Subscribe for ${siteCount} Site${siteCount > 1 ? 's' : ''}` : `Update to ${siteCount} Site${siteCount > 1 ? 's' : ''}`}
          </button>
          <span className="text-[11px] text-blue-300 text-center md:text-right">
            Instant activation via Stripe • Cancel or adjust anytime
          </span>
        </div>
      </div>
    </div>
  );
}

// 6. Endpoint SMS Credits & Automatic Overage Management Section
export function SmsUsageOverview({
  includedCredits,
  totalCreditsUsed,
  endpoints,
  isTrial,
}: {
  includedCredits: number;
  totalCreditsUsed: number;
  endpoints: any[];
  isTrial?: boolean;
}) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<any | null>(null);
  const [newOption, setNewOption] = useState<'STOP_AT_LIMIT' | 'AUTO_OVERAGE'>('AUTO_OVERAGE');
  const [overageCapDollars, setOverageCapDollars] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const usagePercent = Math.min(100, Math.round((totalCreditsUsed / Math.max(1, includedCredits)) * 100));

  const handleOpenModal = (ep: any) => {
    setSelectedEndpoint(ep);
    setNewOption(ep.smsUsageOption === 'STOP_AT_LIMIT' ? 'STOP_AT_LIMIT' : 'AUTO_OVERAGE');
    setOverageCapDollars(ep.monthlyOverageLimitCents ? String(ep.monthlyOverageLimitCents / 100) : '');
  };

  const handleSaveEndpointSettings = async () => {
    if (!selectedEndpoint) return;
    setSaving(true);

    try {
      const capCents = overageCapDollars.trim() ? Math.round(parseFloat(overageCapDollars) * 100) : null;
      const res = await fetch(`/api/endpoints/${selectedEndpoint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smsUsageOption: newOption,
          monthlyOverageLimitCents: capCents,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to update SMS settings');
        setSaving(false);
        return;
      }

      setSelectedEndpoint(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">SMS Delivery Credits &amp; Overage Options</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Each endpoint includes 250 monthly SMS delivery credits. Choose whether delivery stops at 250 or continues with Automatic Overage Billing.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 flex-shrink-0">
          <div>
            <span className="text-[11px] text-gray-500 uppercase font-bold block">Account Credits</span>
            <span className="text-base font-bold text-gray-900">
              {totalCreditsUsed} / {includedCredits} used
            </span>
          </div>
          <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                usagePercent >= 100 ? 'bg-red-600' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Two Options Explanatory Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1 */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Option 1</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
              Strict Cap
            </span>
          </div>
          <h4 className="font-bold text-sm text-gray-900">Stop at 250 Credits</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            SMS delivery halts when this endpoint reaches 250 credits. Alerts are sent at 80%, 90%, and 100%. SMS resumes at the next monthly cycle.
          </p>
        </div>

        {/* Option 2 */}
        <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Option 2</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
              Recommended
            </span>
          </div>
          <h4 className="font-bold text-sm text-blue-950">Automatic Overage Billing ($10 / block)</h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            Ensures mission-critical alarms never stop forwarding. Each additional block of 250 SMS credits costs $10 (0–250: Included, 251–500: $10, 501–750: $20, etc.). You can set an optional monthly budget cap.
          </p>
        </div>
      </div>

      {/* Endpoints Credit Usage Table */}
      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10.5px]">
            <tr>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3">Site Location</th>
              <th className="px-4 py-3">Credits Used This Month</th>
              <th className="px-4 py-3">Usage Option</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {endpoints.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No active email endpoints configured.
                </td>
              </tr>
            ) : (
              endpoints.map((ep) => {
                const isStop = ep.smsUsageOption === 'STOP_AT_LIMIT';
                const used = ep.creditsUsedThisPeriod || 0;
                const limit = ep.creditsLimit || (isTrial ? 25 : 250);
                const epPct = Math.min(100, Math.round((used / limit) * 100));

                return (
                  <tr key={ep.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900">{ep.label}</p>
                      <p className="text-[11px] text-blue-600 font-mono">{ep.localPart}@{ep.domain?.hostname || 'alarms.liablealerts.com'}</p>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-600">
                      {ep.site?.name || 'Main Site'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1 max-w-[140px]">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span>{used} / {limit}</span>
                          <span className={used >= limit ? 'text-red-600' : 'text-gray-400'}>{epPct}%</span>
                        </div>
                        <div className="w-full bg-gray-150 h-1.5 rounded-full overflow-hidden bg-gray-200">
                          <div
                            className={`h-full rounded-full ${
                              used >= limit ? 'bg-red-600' : used >= 200 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${epPct}%` }}
                          />
                        </div>
                        {ep.overageChargeDollars > 0 && (
                          <span className="text-[10px] font-bold text-amber-700 block">
                            +${ep.overageChargeDollars} Overage ({ep.overageCredits} extra credits)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {isStop ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          Stop at 250
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Auto-Overage ($10/block)
                          {ep.monthlyOverageLimitCents ? ` (Cap: $${ep.monthlyOverageLimitCents / 100})` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(ep)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Configure Modal */}
      {selectedEndpoint && (
        <Portal>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !saving) setSelectedEndpoint(null);
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-gray-900">Configure SMS Usage Option</h3>
                  <p className="text-xs text-gray-500">{selectedEndpoint.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEndpoint(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label
                  onClick={() => setNewOption('AUTO_OVERAGE')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition ${
                    newOption === 'AUTO_OVERAGE'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="smsOption"
                    checked={newOption === 'AUTO_OVERAGE'}
                    onChange={() => setNewOption('AUTO_OVERAGE')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-gray-900 block">
                      Option 2: Automatic Overage Billing (Recommended)
                    </span>
                    <p className="text-gray-500">
                      Alarms continue after 250 credits. Each extra 250 SMS credits costs $10.
                    </p>
                  </div>
                </label>

                {newOption === 'AUTO_OVERAGE' && (
                  <div className="pl-7 pr-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                      Optional Monthly Spend Cap ($)
                    </label>
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={overageCapDollars}
                      onChange={(e) => setOverageCapDollars(e.target.value)}
                      placeholder="e.g. 50 (leave empty for unlimited)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                    <span className="text-[10px] text-gray-400 block">
                      Leave blank to allow uninterrupted critical alarms.
                    </span>
                  </div>
                )}

                <label
                  onClick={() => setNewOption('STOP_AT_LIMIT')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition ${
                    newOption === 'STOP_AT_LIMIT'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="smsOption"
                    checked={newOption === 'STOP_AT_LIMIT'}
                    onChange={() => setNewOption('STOP_AT_LIMIT')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-gray-900 block">
                      Option 1: Stop at 250 Credits
                    </span>
                    <p className="text-gray-500">
                      SMS delivery stops when this endpoint hits 250 credits. Warnings sent at 80%, 90%, 100%.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEndpoint(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEndpointSettings}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Setting
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
