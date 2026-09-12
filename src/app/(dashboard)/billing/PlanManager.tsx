'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Loader2, ArrowUpCircle, TrendingUp, CreditCard, Plus, Minus,
  CheckCircle2, Shield, AlertCircle, FileText, Download, X,
  Calendar, DollarSign, Layers, Lock, Sparkles, ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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

// 2. In-App Payment Method & Card Details Manager
export function PaymentMethodSection({ initialCard }: { initialCard?: any }) {
  const [card, setCard] = useState<any>(initialCard || null);
  const [loading, setLoading] = useState(!initialCard);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  // Format card number with spaces (e.g. 4242 4242 4242 4242)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  // Card brand detection helper
  const getBrandIcon = (brandName?: string) => {
    const b = (brandName || '').toLowerCase();
    if (b.includes('visa')) return 'VISA';
    if (b.includes('master')) return 'MC';
    if (b.includes('amex')) return 'AMEX';
    if (b.includes('discover')) return 'DISC';
    return 'CARD';
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/billing/payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber,
          expMonth,
          expYear,
          cvc,
          cardholderName,
          postalCode,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to update payment method');
        setSaving(false);
        return;
      }

      setCard(json.card);
      setSuccessMsg('Payment method successfully saved!');
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg('');
        setCardNumber('');
        setExpMonth('');
        setExpYear('');
        setCvc('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error updating card');
    } finally {
      setSaving(false);
    }
  };

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
          onClick={() => { setShowModal(true); setError(''); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition border border-blue-200 self-start sm:self-auto"
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
            Add a credit card directly here to ensure uninterrupted notification delivery and access to additional endpoints.
          </p>
        </div>
      )}

      {/* In-App Update Card Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-gray-900">Payment Information</h3>
                  <p className="text-[11px] text-gray-400">Card details are securely encrypted and saved</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSaveCard} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Cardholder Name *
                </label>
                <input
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Mauricio Arias"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Card Number *
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 font-mono text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <div className="absolute right-3 top-2.5 text-gray-400 font-bold text-[11px]">
                    {getBrandIcon(cardNumber)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Month *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={12}
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    placeholder="MM (e.g. 09)"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Year *
                  </label>
                  <input
                    required
                    type="number"
                    min={2026}
                    max={2040}
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    placeholder="YYYY (2028)"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    CVC *
                  </label>
                  <input
                    required
                    type="password"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="CVC"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 font-mono text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Billing ZIP / Postal Code
                </label>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="33134"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                >
                  {saving ? 'Saving Card...' : 'Save Payment Method'}
                </Button>
              </div>
            </form>
          </div>
        </div>
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
  const monthlyCost = selectedCount * 12;
  const hasChanged = selectedCount !== extraCount;

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              +1
            </div>
            <h3 className="text-[17px] font-bold text-gray-900">Additional Email Endpoints</h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              $12.00 / month each
            </span>
          </div>
          <p className="text-[13px] text-gray-500">
            Need more email endpoints without upgrading to a larger plan? Purchase individual endpoints with any plan.
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
            {basePlanMax} from {planName} plan + {selectedCount} purchased
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
            onClick={() => handleUpdateCapacity(selectedCount)}
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
