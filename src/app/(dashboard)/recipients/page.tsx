'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Phone, Plus, Trash2, Loader2, Search, CheckCircle2, XCircle, Copy, CheckCheck,
  Edit2, MapPin, Users, Mail, AlertTriangle, Sparkles, X, Filter
} from 'lucide-react';
import { formatPhoneDisplay, normalizePhoneE164 } from '@/lib/phone';

interface Recipient {
  id: string;
  phoneE164: string;
  label: string | null;
  optedOut: boolean;
  _count: { endpoints: number };
  customerNames?: string[];
  siteNames?: string[];
  endpoints?: Array<{
    id: string;
    label: string | null;
    localPart: string;
    site?: { name: string };
    customer?: { name: string };
  }>;
}

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [phoneE164, setPhoneE164] = useState('');
  const [label, setLabel] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('ALL');
  const [filterSite, setFilterSite] = useState('ALL');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Quick Assign Modal state
  const [assigningRecipient, setAssigningRecipient] = useState<Recipient | null>(null);
  const [quickEndpointId, setQuickEndpointId] = useState('');
  const [quickAssigning, setQuickAssigning] = useState(false);

  // Duplicate Auto-Merge state
  const [merging, setMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState('');

  const fetchRecipients = useCallback(async () => {
    try {
      const [recRes, epRes] = await Promise.all([
        fetch('/api/recipients'),
        fetch('/api/endpoints'),
      ]);
      const [recJson, epJson] = await Promise.all([recRes.json(), epRes.json()]);
      setRecipients(recJson.data || []);
      setEndpoints(epJson.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const url = editingId ? `/api/recipients/${editingId}` : '/api/recipients';
    const method = editingId ? 'PATCH' : 'POST';

    const body = editingId 
      ? JSON.stringify({ label }) 
      : JSON.stringify({
          phoneE164,
          label,
          endpointId: selectedEndpointId || undefined,
        });

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Failed to save recipient'); setSaving(false); return; }
    
    closeForm();
    fetchRecipients();
  };

  const handleEdit = (recipient: Recipient) => {
    setPhoneE164(recipient.phoneE164);
    setLabel(recipient.label || '');
    setEditingId(recipient.id);
    setSelectedEndpointId('');
    setShowForm(true);
  };

  const closeForm = () => {
    setPhoneE164(''); 
    setLabel(''); 
    setSelectedEndpointId('');
    setConsentGiven(false);
    setShowForm(false); 
    setSaving(false);
    setEditingId(null);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this recipient? This will also remove them from all endpoints.')) return;
    setDeleting(id);
    await fetch(`/api/recipients/${id}`, { method: 'DELETE' });
    setDeleting(null);
    fetchRecipients();
  };

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRecipient || !quickEndpointId) return;
    setQuickAssigning(true);

    try {
      const res = await fetch(`/api/endpoints/${quickEndpointId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: assigningRecipient.id }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to assign recipient');
        setQuickAssigning(false);
        return;
      }

      setAssigningRecipient(null);
      setQuickEndpointId('');
      fetchRecipients();
    } catch (err: any) {
      alert(err.message || 'Error assigning recipient');
    } finally {
      setQuickAssigning(false);
    }
  };

  const handleAutoMerge = async () => {
    setMerging(true);
    setMergeSuccess('');

    try {
      const res = await fetch('/api/recipients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoMergeAll: true }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to merge duplicates');
        setMerging(false);
        return;
      }

      setMergeSuccess(`Successfully merged ${json.mergedCount || 0} duplicate recipient(s)!`);
      fetchRecipients();
      setTimeout(() => setMergeSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Error merging duplicates');
    } finally {
      setMerging(false);
    }
  };

  // Check for duplicate normalized numbers in current list
  const duplicatePhones = (() => {
    const counts = new Map<string, number>();
    for (const r of recipients) {
      const norm = normalizePhoneE164(r.phoneE164);
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
    const dups = new Set<string>();
    for (const [norm, count] of counts.entries()) {
      if (count > 1) dups.add(norm);
    }
    return dups;
  })();

  // Unique customers & sites for filtering
  const allCustomerNames = Array.from(new Set(recipients.flatMap((r) => r.customerNames || []).filter(Boolean)));
  const allSiteNames = Array.from(new Set(recipients.flatMap((r) => r.siteNames || []).filter(Boolean)));

  const filtered = recipients.filter((r) => {
    const matchesSearch =
      r.phoneE164.includes(search) ||
      (r.label?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const matchesCustomer =
      filterCustomer === 'ALL' ||
      (r.customerNames && r.customerNames.includes(filterCustomer));

    const matchesSite =
      filterSite === 'ALL' ||
      (r.siteNames && r.siteNames.includes(filterSite));

    return matchesSearch && matchesCustomer && matchesSite;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[32px] font-bold text-ink-black leading-tight">Phone Recipients</h1>
          <p className="text-smoke mt-1 text-sm tracking-[-0.32px] leading-[1.35]">
            Manage phone numbers that receive SMS alerts across customers and sites
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-signal-blue text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Recipient
        </button>
      </div>

      {/* Duplicate Detection Alert Banner */}
      {duplicatePhones.size > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Duplicate Phone Numbers Detected</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Some recipients share the same phone number in different formats. Merge them to consolidate endpoint alerts.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoMerge}
            disabled={merging}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 whitespace-nowrap self-start sm:self-auto"
          >
            {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {merging ? 'Merging...' : 'Merge Duplicates Now'}
          </button>
        </div>
      )}

      {mergeSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-2xl font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          {mergeSuccess}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slideUp">
          <h3 className="font-bold text-[16px] text-gray-900 mb-5">
            {editingId ? 'Edit Recipient' : 'New Phone Recipient'}
          </h3>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-[13px] mb-4 flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Phone Number (10 digits or E.164) *
                </label>
                <input
                  required
                  type="tel"
                  value={phoneE164}
                  onChange={(e) => setPhoneE164(e.target.value)}
                  placeholder="305-753-7770 or +13057537770"
                  disabled={!!editingId}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono disabled:opacity-60"
                />
                <p className="text-[11px] text-gray-400 mt-1">Accepts standard 10-digit US numbers or full international format</p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Label / Name
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Lina (On-Call)"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Optional Immediate Endpoint Assignment */}
            {!editingId && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Assign to Email Endpoint (Optional)
                </label>
                <select
                  value={selectedEndpointId}
                  onChange={(e) => setSelectedEndpointId(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                >
                  <option value="">Do not assign yet (Save as recipient only)</option>
                  {endpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.customer?.name ? `${ep.customer.name} • ` : ''}
                      {ep.site?.name ? `${ep.site.name} • ` : ''}
                      {ep.label} ({ep.localPart})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  You can immediately connect this recipient to an endpoint at a customer/site right now.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="recipientConsent"
                  required={!editingId}
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
                />
                <label htmlFor="recipientConsent" className="text-xs text-gray-700 leading-relaxed cursor-pointer">
                  I confirm that this recipient has provided prior express consent to receive recurring automated operational and system alarm alert text messages from Liable Alerts at this mobile number. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help. View our{' '}
                  <Link href="/terms" target="_blank" className="text-blue-600 underline hover:text-blue-800 font-medium">Terms and Conditions</Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" className="text-blue-600 underline hover:text-blue-800 font-medium">Privacy Policy</Link>.
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-signal-blue text-white px-5 py-2.5 rounded-full font-semibold text-[13px] disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? null : <Plus className="w-4 h-4" />)}
                {saving ? 'Saving…' : (editingId ? 'Save Changes' : 'Add Recipient')}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 border-2 border-gray-200 text-gray-600 rounded-full font-medium text-[13px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone number or name..."
            className="w-full text-[13px] text-gray-800 outline-none bg-transparent placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[11px] text-gray-400 hover:text-gray-600">
              Clear
            </button>
          )}
        </div>

        {/* Customer Filter */}
        {allCustomerNames.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none font-semibold"
            >
              <option value="ALL">All Customers</option>
              {allCustomerNames.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Site Filter */}
        {allSiteNames.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none font-semibold"
            >
              <option value="ALL">All Sites</option>
              {allSiteNames.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-gray-900">All Recipients ({filtered.length})</h2>
          <span className="text-[12px] text-gray-400">{recipients.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-signal-blue" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-gray-700">
                {search ? 'No recipients match your search' : 'No recipients yet'}
              </p>
              <p className="text-[12px] text-gray-400 mt-1">
                {search ? 'Try a different search term' : 'Add a phone number to start receiving SMS alerts'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer & Site</th>
                  <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Endpoints</th>
                  <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => {
                  const isDup = duplicatePhones.has(normalizePhoneE164(r.phoneE164));

                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${isDup ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-[12px]">
                            {(r.label || r.phoneE164).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[14px] font-semibold text-gray-900">
                              {r.label || <span className="text-gray-400 italic">No label</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-mono font-semibold text-gray-800">
                            {formatPhoneDisplay(r.phoneE164)}
                          </span>
                          <button
                            onClick={() => copyPhone(r.phoneE164, r.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy number"
                          >
                            {copied === r.id ? (
                              <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer & Site Column */}
                      <td className="px-6 py-4">
                        {r.endpoints && r.endpoints.length > 0 ? (
                          <div className="space-y-1">
                            {r.endpoints.slice(0, 2).map((ep: any) => (
                              <div key={ep.id} className="text-xs text-gray-600 flex items-center gap-1.5 truncate max-w-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                <span className="font-semibold text-gray-800 truncate">{ep.customer?.name || 'Customer'}</span>
                                {ep.site?.name && <span className="text-gray-400">• {ep.site.name}</span>}
                              </div>
                            ))}
                            {r.endpoints.length > 2 && (
                              <span className="text-[10px] text-gray-400 block">+{r.endpoints.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-700 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Unassigned
                            </span>
                            <button
                              onClick={() => setAssigningRecipient(r)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Assign
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold ${
                          r._count.endpoints > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {r._count.endpoints}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {r.optedOut ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                            <XCircle className="w-3 h-3" />
                            Opted Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit recipient"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Remove recipient"
                          >
                            {deleting === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Assign to Endpoint Modal */}
      {assigningRecipient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-[16px] text-gray-900">
                Assign to Endpoint
              </h3>
              <button
                onClick={() => setAssigningRecipient(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select an endpoint to start sending SMS alerts to{' '}
              <strong>{assigningRecipient.label || formatPhoneDisplay(assigningRecipient.phoneE164)}</strong>:
            </p>

            <form onSubmit={handleQuickAssign} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Target Endpoint *
                </label>
                <select
                  required
                  value={quickEndpointId}
                  onChange={(e) => setQuickEndpointId(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select an endpoint...</option>
                  {endpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.customer?.name ? `${ep.customer.name} • ` : ''}
                      {ep.site?.name ? `${ep.site.name} • ` : ''}
                      {ep.label} ({ep.localPart})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningRecipient(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAssigning || !quickEndpointId}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {quickAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Assign Recipient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
