'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2, Mail, Info, ShieldAlert, Sparkles, Check, Phone, X, Users, MapPin } from 'lucide-react';
import Link from 'next/link';
import { normalizePhoneE164, formatPhoneDisplay } from '@/lib/phone';

interface Customer { id: string; name: string; }
interface Site { id: string; name: string; customerId: string; }
interface SavedRecipient { id: string; phoneE164: string; label: string | null; }

export default function CreateEndpointPage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [customHandle, setCustomHandle] = useState('');
  const [domain, setDomain] = useState('alarms.liablealerts.com');
  const [notes, setNotes] = useState('');
  const [severityTag, setSeverityTag] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [siteId, setSiteId] = useState('');
  
  // Selected recipients: can be saved recipient IDs or phone strings
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [customPhoneNumbers, setCustomPhoneNumbers] = useState<string[]>([]);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAtLimit, setIsAtLimit] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{ active: number; max: number } | null>(null);

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerNotes, setNewCustomerNotes] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState('');

  // Quick Add Site Modal
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [creatingSite, setCreatingSite] = useState(false);
  const [addSiteError, setAddSiteError] = useState('');

  const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    setCreatingCustomer(true);
    setAddCustomerError('');

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName.trim(), notes: newCustomerNotes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddCustomerError(json.error || 'Failed to create customer');
        setCreatingCustomer(false);
        return;
      }

      const created = json.data;
      setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomerId(created.id);
      setSiteId('');
      setNewCustomerName('');
      setNewCustomerNotes('');
      setShowAddCustomerModal(false);
    } catch (err: any) {
      setAddCustomerError(err.message || 'Error creating customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleQuickCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !customerId) return;
    setCreatingSite(true);
    setAddSiteError('');

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSiteName.trim(), address: newSiteAddress.trim() || undefined, customerId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddSiteError(json.error || 'Failed to create site');
        setCreatingSite(false);
        return;
      }

      const created = json.data;
      setSites((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSiteId(created.id);
      setNewSiteName('');
      setNewSiteAddress('');
      setShowAddSiteModal(false);
    } catch (err: any) {
      setAddSiteError(err.message || 'Error creating site');
    } finally {
      setCreatingSite(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/customers'),
      fetch('/api/sites'),
      fetch('/api/endpoints'),
      fetch('/api/dashboard/usage'),
      fetch('/api/recipients'),
    ]).then(async ([cr, sr, er, ur, recr]) => {
      const [cJson, sJson, eJson, uJson, recJson] = await Promise.all([
        cr.json(), sr.json(), er.json(), ur.json(), recr.json()
      ]);
      setCustomers(cJson.data || []);
      setSites(sJson.data || []);
      setSavedRecipients(recJson.data || []);
      
      const activeCount = uJson.data?.activeEndpoints ?? (eJson.data || []).filter((e: any) => e.status === 'ACTIVE').length;
      const maxAllowed = uJson.data?.maxEndpoints ?? 1;
      setUsageInfo({ active: activeCount, max: maxAllowed });
      if (activeCount >= maxAllowed) {
        setIsAtLimit(true);
      }
    });
  }, []);

  const filteredSites = customerId ? sites.filter((s) => s.customerId === customerId) : sites;

  const toggleSavedRecipient = (id: string) => {
    if (selectedRecipientIds.includes(id)) {
      setSelectedRecipientIds(selectedRecipientIds.filter((item) => item !== id));
    } else {
      setSelectedRecipientIds([...selectedRecipientIds, id]);
    }
  };

  const handleAddNewCustomPhone = () => {
    const norm = normalizePhoneE164(newPhoneInput);
    if (!norm || norm.length < 8) {
      alert('Please enter a valid phone number');
      return;
    }
    if (!customPhoneNumbers.includes(norm)) {
      setCustomPhoneNumbers([...customPhoneNumbers, norm]);
    }
    setNewPhoneInput('');
  };

  const handleRemoveCustomPhone = (index: number) => {
    setCustomPhoneNumbers(customPhoneNumbers.filter((_, idx) => idx !== index));
  };

  const handleHandleChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    setCustomHandle(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

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

    // Combine selected saved recipient IDs and custom normalized phone numbers
    const allRecipients = [
      ...selectedRecipientIds,
      ...customPhoneNumbers,
    ];

    // If user typed a number in the box but didn't click Add, include it
    if (newPhoneInput.trim()) {
      const norm = normalizePhoneE164(newPhoneInput.trim());
      if (norm && !allRecipients.includes(norm)) {
        allRecipients.push(norm);
      }
    }

    if (allRecipients.length === 0) {
      setError('Please select at least one recipient phone number to receive alerts.');
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
        recipients: allRecipients 
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.code === 'PLAN_LIMIT_EXCEEDED') {
        setIsAtLimit(true);
        setError('Subscription plan active email account limit reached. Please add additional endpoints in Billing ($12/mo each) or upgrade your plan.');
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

      {/* Limit Exceeded Alert */}
      {isAtLimit && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Plan Limit Reached</h4>
            <p className="text-amber-700 text-xs mt-1">
              You are using <strong>{usageInfo?.active} of {usageInfo?.max}</strong> active endpoints. You can add single endpoints for <strong>$12/month</strong> or upgrade your plan in Billing.
            </p>
            <Link href="/billing" className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors">
              Add Endpoints in Billing →
            </Link>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">1 · Account Details</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Label / Friendly Name *</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Loews Gables Maintenance Team"
                className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Used to identify this endpoint in your dashboard and notification logs.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Custom Email Handle <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <input
                  type="text"
                  value={customHandle}
                  onChange={(e) => handleHandleChange(e.target.value)}
                  placeholder={label ? displayedHandle : 'e.g. loewsmaintenance'}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-900 outline-none font-mono"
                />
                <span className="px-4 py-2.5 bg-gray-50 border-l border-gray-200 text-sm font-mono text-gray-500 select-none">
                  @{domain}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate a handle based on your label.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Customer *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Customer
                  </button>
                </div>
                <select
                  required
                  value={customerId}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddCustomerModal(true);
                    } else {
                      setCustomerId(e.target.value);
                      setSiteId('');
                    }
                  }}
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a customer...</option>
                  <option value="__add_new__" className="font-semibold text-blue-600">+ Add New Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Site *</label>
                  {customerId && (
                    <button
                      type="button"
                      onClick={() => setShowAddSiteModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Site
                    </button>
                  )}
                </div>
                <select
                  required
                  value={siteId}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddSiteModal(true);
                    } else {
                      setSiteId(e.target.value);
                    }
                  }}
                  disabled={!customerId}
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">{customerId ? 'Select a site...' : 'Select customer first'}</option>
                  {customerId && (
                    <option value="__add_new__" className="font-semibold text-blue-600">+ Add New Site...</option>
                  )}
                  {filteredSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <p className="text-xs text-gray-600">Choose from your saved recipients or add a new phone number to receive alerts for this endpoint.</p>

            {/* Saved Recipients Selector */}
            {savedRecipients.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Select from Saved Recipients:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedRecipients.map((r) => {
                    const isSelected = selectedRecipientIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleSavedRecipient(r.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-gray-900 truncate">{r.label || 'Recipient'}</p>
                          <p className="text-[11px] font-mono text-gray-600">{formatPhoneDisplay(r.phoneE164)}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Phone Numbers List */}
            {customPhoneNumbers.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Additional Numbers Added:
                </label>
                <div className="flex flex-wrap gap-2">
                  {customPhoneNumbers.map((num, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-mono font-medium border border-gray-200">
                      {formatPhoneDisplay(num)}
                      <button type="button" onClick={() => handleRemoveCustomPhone(i)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Input to Add New Number */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Add Another Phone Number:
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={newPhoneInput}
                  onChange={(e) => setNewPhoneInput(e.target.value)}
                  placeholder="305-753-7770 or +13057537770"
                  className="flex-1 border border-gray-300 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewCustomPhone}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
                >
                  Add Number
                </button>
              </div>
            </div>

            {/* Compliance callout */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed space-y-1">
              <p>
                <strong>SMS Consent Requirement:</strong> By adding mobile recipient numbers, you confirm that recipients have provided prior, express consent to receive automated operational text messages from Liable Alerts. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel or HELP for help. View the{' '}
                <Link href="/terms" target="_blank" className="text-blue-700 underline font-semibold">Terms and Conditions</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-blue-700 underline font-semibold">Privacy Policy</Link>.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Link href="/endpoints" className="px-5 py-2.5 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center">
              Cancel
            </Link>
            <button type="submit" disabled={isLoading || isAtLimit}
              className="flex items-center justify-center min-w-[160px] px-6 py-2.5 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-sm">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Email Endpoint'}
            </button>
          </div>
        </form>
      </div>
      {/* Inline Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600"><Users className="w-5 h-5" /></span>
                <h3 className="font-bold text-[17px] text-gray-900">Add New Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setAddCustomerError('');
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addCustomerError && (
              <div className="text-red-600 bg-red-50 border border-red-200 text-xs p-3 rounded-xl">
                {addCustomerError}
              </div>
            )}

            <form onSubmit={handleQuickCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name *</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={newCustomerNotes}
                  onChange={(e) => setNewCustomerNotes(e.target.value)}
                  placeholder="Billing address, account manager, or department..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setAddCustomerError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCustomer || !newCustomerName.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {creatingCustomer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {creatingCustomer ? 'Creating...' : 'Save & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Add Site Modal */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600"><MapPin className="w-5 h-5" /></span>
                <div>
                  <h3 className="font-bold text-[17px] text-gray-900">Add New Site</h3>
                  <p className="text-xs text-gray-500">
                    For Customer: <strong>{customers.find(c => c.id === customerId)?.name || 'Selected Customer'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddSiteModal(false);
                  setAddSiteError('');
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addSiteError && (
              <div className="text-red-600 bg-red-50 border border-red-200 text-xs p-3 rounded-xl">
                {addSiteError}
              </div>
            )}

            <form onSubmit={handleQuickCreateSite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Site Name *</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="e.g. Building A - Central Plant"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Site Address (Optional)</label>
                <input
                  type="text"
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  placeholder="e.g. 100 Main St, Suite 400"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSiteModal(false);
                    setAddSiteError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSite || !newSiteName.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {creatingSite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {creatingSite ? 'Creating...' : 'Save & Select Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
