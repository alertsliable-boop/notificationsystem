'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2, Mail, Info, ShieldAlert, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Customer { id: string; name: string; }
interface Site { id: string; name: string; customerId: string; }

export default function CreateEndpointPage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [customHandle, setCustomHandle] = useState('');
  const [domain, setDomain] = useState('mail.liablealerts.com');
  const [notes, setNotes] = useState('');
  const [severityTag, setSeverityTag] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [recipients, setRecipients] = useState(['']);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAtLimit, setIsAtLimit] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{ active: number; max: number } | null>(null);

  const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  useEffect(() => {
    Promise.all([
      fetch('/api/customers'),
      fetch('/api/sites'),
      fetch('/api/endpoints'),
      fetch('/api/billing/switch-plan') // or billing info
    ]).then(async ([cr, sr, er]) => {
      const [cJson, sJson, eJson] = await Promise.all([cr.json(), sr.json(), er.json()]);
      setCustomers(cJson.data || []);
      setSites(sJson.data || []);
      
      const activeCount = (eJson.data || []).filter((e: any) => e.status === 'ACTIVE').length;
      setUsageInfo({ active: activeCount, max: 25 }); // default max
    });
  }, []);

  const filteredSites = customerId ? sites.filter((s) => s.customerId === customerId) : sites;

  const handleAddRecipient = () => setRecipients([...recipients, '']);
  const handleRemoveRecipient = (i: number) => setRecipients(recipients.filter((_, idx) => idx !== i));
  const handleRecipientChange = (i: number, v: string) => {
    const updated = [...recipients];
    updated[i] = v;
    setRecipients(updated);
  };

  const handleHandleChange = (val: string) => {
    // Sanitize string for email handle
    const sanitized = val.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    setCustomHandle(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate required fields
    if (!label.trim()) {
      setError('Label / Friendly name is required.');
      setIsLoading(false);
      return;
    }

    if (!customerId || !siteId) {
      setError('Customer and Site assignment are required.');
      setIsLoading(false);
      return;
    }

    const cleanRecipients = recipients.map((r) => r.trim()).filter(Boolean).map((r) => (r.startsWith('+') ? r : `+${r}`));
    if (cleanRecipients.length === 0) {
      setError('At least one valid phone recipient is required for SMS notifications.');
      setIsLoading(false);
      return;
    }

    const res = await fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        label, 
        localPart: customHandle || undefined,
        domainName: domain,
        notes, 
        severityTag: severityTag || undefined, 
        customerId, 
        siteId,
        recipients: cleanRecipients 
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.code === 'PLAN_LIMIT_EXCEEDED') {
        setIsAtLimit(true);
        setError('Subscription plan active email account limit reached. Please upgrade your plan in Billing.');
      } else {
        setError(data.error || 'Failed to create inbound email account.');
      }
      setIsLoading(false);
      return;
    }

    router.push(`/endpoints/${data.data.id}`);
    router.refresh();
  };

  const displayedHandle = customHandle || (label
    ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 16)
    : 'your-endpoint');

  const previewAddress = `${displayedHandle}@${domain}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn py-6">
      <div className="flex items-center gap-3">
        <Link href="/endpoints" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configure Inbound Email Account</h1>
          <p className="text-gray-600 text-sm">Create a unique email endpoint to receive automated equipment notifications.</p>
        </div>
      </div>

      {/* Address Preview Box */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">Inbound Email Address Preview:</p>
          <code className="text-base font-mono text-blue-700 font-bold break-all">{previewAddress}</code>
          <p className="text-xs text-blue-600/80 mt-1">
            Configure this email address into your software or monitoring equipment (e.g. <span className="font-mono text-blue-800">building1@{domain}</span>).
          </p>
        </div>
      </div>

      {isAtLimit && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 text-sm">Licensed Limit Reached</h3>
            <p className="text-xs text-amber-800 mt-1">
              Your company has reached its maximum active email account allowance under your subscription plan. Upgrade your plan to create more endpoints.
            </p>
            <Link href="/billing" className="inline-block mt-3 px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors">
              Upgrade Subscription Plan →
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {error && !isAtLimit && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Endpoint Identification */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">1 · Email Account Identification</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Friendly Name / Label *</label>
              <input
                type="text" required value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Building 1 Generator, Warehouse HVAC, Generator 1"
                className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Custom Inbound Email Handle <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={customHandle}
                  onChange={(e) => handleHandleChange(e.target.value)}
                  placeholder="e.g. building1, warehouse, generator1"
                  className="flex-1 border border-gray-300 bg-white rounded-l-xl px-4 py-2.5 text-sm text-gray-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="bg-gray-100 border border-l-0 border-gray-300 text-gray-600 px-3 py-2.5 text-sm font-mono rounded-r-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="mail.liablealerts.com">@mail.liablealerts.com</option>
                  <option value="gmail.com">@gmail.com</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate a unique prefix based on your label.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer Assignment *</label>
                <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setSiteId(''); }} required
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select customer...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Assignment *</label>
                <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!customerId}>
                  <option value="">Select site{!customerId ? ' (choose customer first)' : ''}...</option>
                  {filteredSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Severity Tag</label>
                <select value={severityTag} onChange={(e) => setSeverityTag(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">None</option>
                  {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initial Status</label>
                <input
                  type="text"
                  disabled
                  value="ACTIVE (Subject to plan limit)"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-green-700 font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes / Description</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Equipment model, location details, maintenance contact..."
                className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" rows={2} />
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Section 2: SMS Notification Recipients */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">2 · SMS Forwarding Recipients</h3>
            <p className="text-xs text-gray-600">Enter mobile numbers in E.164 format (e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">+15551234567</code>)</p>
            <div className="space-y-2.5">
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text" value={r} onChange={(e) => handleRecipientChange(i, e.target.value)}
                    placeholder="+15551234567"
                    required={i === 0}
                    className="flex-1 border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {recipients.length > 1 && (
                    <button type="button" onClick={() => handleRemoveRecipient(i)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={handleAddRecipient} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold py-1">
              <Plus className="w-4 h-4" /> Add another recipient number
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/endpoints" className="px-5 py-2.5 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={isLoading || isAtLimit}
              className="flex items-center justify-center min-w-[160px] px-6 py-2.5 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-sm">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Email Endpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
