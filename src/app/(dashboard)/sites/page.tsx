'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, Edit2, Trash2, Users, Phone, X, CheckCircle2, XCircle, Mail, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatPhoneDisplay } from '@/lib/phone';

interface Site {
  id: string;
  name: string;
  address: string | null;
  customerId: string;
  customer: { id: string; name: string };
  _count: { endpoints: number; recipients?: number };
}

interface Customer {
  id: string;
  name: string;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Site Recipients Drawer / Modal State
  const [selectedSiteForRecipients, setSelectedSiteForRecipients] = useState<Site | null>(null);
  const [siteRecipientsLoading, setSiteRecipientsLoading] = useState(false);
  const [siteEndpoints, setSiteEndpoints] = useState<any[]>([]);
  const [siteRecipients, setSiteRecipients] = useState<any[]>([]);
  const [availableRecipients, setAvailableRecipients] = useState<any[]>([]);

  // Assign Recipient State in Drawer
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientLabel, setNewRecipientLabel] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchData = async () => {
    const [sitesRes, custRes] = await Promise.all([fetch('/api/sites'), fetch('/api/customers')]);
    const [sitesJson, custJson] = await Promise.all([sitesRes.json(), custRes.json()]);
    setSites(sitesJson.data || []);
    setCustomers(custJson.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const url = editingId ? `/api/sites/${editingId}` : '/api/sites';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, customerId }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Failed'); setSaving(false); return; }
    
    closeForm();
    fetchData();
  };

  const handleEdit = (site: Site) => {
    setName(site.name);
    setAddress(site.address || '');
    setCustomerId(site.customer.id || site.customerId || ''); 
    setEditingId(site.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) { alert(json.error || 'Failed to delete'); }
    setDeletingId(null);
    fetchData();
  };

  const closeForm = () => {
    setName('');
    setAddress('');
    setCustomerId('');
    setShowForm(false);
    setSaving(false);
    setEditingId(null);
    setError('');
  };

  // Open Site Recipients Drawer
  const openSiteRecipients = async (site: Site) => {
    setSelectedSiteForRecipients(site);
    setSiteRecipientsLoading(true);
    setAssignError('');
    setSelectedRecipientId('');
    setNewRecipientPhone('');
    setNewRecipientLabel('');

    try {
      const res = await fetch(`/api/sites/${site.id}/recipients`);
      const json = await res.json();
      setSiteEndpoints(json.endpoints || []);
      setSiteRecipients(json.recipients || []);
      setAvailableRecipients(json.availableRecipients || []);
      if (json.endpoints && json.endpoints.length > 0) {
        setSelectedEndpointId(json.endpoints[0].id);
      }
    } catch (err) {
      console.error('Error fetching site recipients:', err);
    } finally {
      setSiteRecipientsLoading(false);
    }
  };

  const handleAssignRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteForRecipients) return;
    setAssigning(true);
    setAssignError('');

    try {
      const body = assignMode === 'existing'
        ? { endpointId: selectedEndpointId, recipientId: selectedRecipientId }
        : { endpointId: selectedEndpointId, phone: newRecipientPhone, label: newRecipientLabel };

      const res = await fetch(`/api/sites/${selectedSiteForRecipients.id}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setAssignError(json.error || 'Failed to assign recipient');
        setAssigning(false);
        return;
      }

      // Refresh drawer & table
      openSiteRecipients(selectedSiteForRecipients);
      fetchData();
    } catch (err: any) {
      setAssignError(err.message || 'Error assigning recipient');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnlinkRecipient = async (endpointId: string, recipientId: string) => {
    if (!selectedSiteForRecipients) return;
    if (!confirm('Remove this recipient from this endpoint?')) return;

    try {
      await fetch(`/api/sites/${selectedSiteForRecipients.id}/recipients?endpointId=${endpointId}&recipientId=${recipientId}`, {
        method: 'DELETE',
      });
      openSiteRecipients(selectedSiteForRecipients);
      fetchData();
    } catch (err) {
      console.error('Error unlinking recipient:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[32px] font-bold text-ink-black leading-tight">Sites</h1>
          <p className="text-smoke mt-1 text-sm tracking-[-0.32px] leading-[1.35]">Assign physical locations to customers, endpoints, and recipients.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center justify-center gap-2 bg-signal-blue text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-colors self-start sm:self-auto shadow-sm">
          <Plus className="w-4 h-4" /> Add Site
        </button>
      </div>

      <div className="space-y-6">

      {showForm && (
        <div className="bg-paper-white rounded-2xl shadow-subtle p-5 sm:p-6 border border-ash-mist">
          <h3 className="font-semibold mb-5 text-ink-black text-base tracking-[-0.36px]">{editingId ? 'Edit Site' : 'New Site'}</h3>
          {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-smoke mb-1.5 tracking-[-0.24px]">Site Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="North Building" className="w-full border border-ash-mist bg-paper-white rounded-xl px-4 py-2.5 text-sm text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-smoke mb-1.5 tracking-[-0.24px]">Customer *</label>
              <select required value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-ash-mist bg-paper-white rounded-xl px-4 py-2.5 text-sm text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all">
                <option value="">Select a customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-smoke mb-1.5 tracking-[-0.24px]">Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, State" className="w-full border border-ash-mist bg-paper-white rounded-xl px-4 py-2.5 text-sm text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-signal-blue text-white px-5 py-2.5 rounded-full font-semibold text-sm disabled:opacity-50 transition-opacity">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Save Changes' : 'Create Site')}
              </button>
              <button type="button" onClick={closeForm} className="px-5 py-2.5 bg-transparent border border-ink-black text-ink-black rounded-full font-medium text-sm hover:bg-ash-mist transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-paper-white rounded-2xl shadow-subtle overflow-hidden border border-ash-mist">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-smoke" /></div> :
         sites.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-smoke gap-3 px-4 text-center">
            <MapPin className="w-12 h-12 text-smoke/40" />
            <p className="text-sm tracking-[-0.28px]">No sites yet. Add a site to organize your endpoints.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-paper-white border-b border-ash-mist">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Endpoints</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Site Recipients</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-mist bg-paper-white">
                {sites.map((s) => (
                  <tr key={s.id} className="hover:bg-ash-mist/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-ink-black tracking-[-0.32px]">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-graphite tracking-[-0.28px]">{s.customer?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-smoke tracking-[-0.28px]">{s.address || '—'}</td>
                    <td className="px-6 py-4 text-sm text-smoke tracking-[-0.28px]">
                      <Link href={`/endpoints?siteId=${s.id}`} className="hover:text-signal-blue underline-offset-2 hover:underline">
                        {s._count.endpoints} endpoint{s._count.endpoints === 1 ? '' : 's'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openSiteRecipients(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition border border-blue-200"
                        title="Click to view and manage recipients for this site"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{s._count.recipients || 0} recipient{s._count.recipients === 1 ? '' : 's'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openSiteRecipients(s)}
                          className="p-2 text-smoke hover:text-blue-600 transition-colors"
                          title="View & Manage Site Recipients"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(s)} className="p-2 text-smoke hover:text-signal-blue transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} className="p-2 text-smoke hover:text-red-500 transition-colors disabled:opacity-50">
                          {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Site Recipients Drawer / Modal */}
      {selectedSiteForRecipients && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 relative space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-600"><Users className="w-5 h-5" /></span>
                  <div>
                    <h3 className="font-bold text-[18px] text-gray-900 leading-tight">
                      Site Recipients — {selectedSiteForRecipients.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Customer: <strong>{selectedSiteForRecipients.customer?.name}</strong>
                      {selectedSiteForRecipients.address && ` • ${selectedSiteForRecipients.address}`}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSiteForRecipients(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {siteRecipientsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Recipients List */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                    Recipients Configured for this Site ({siteRecipients.length})
                  </h4>

                  {siteRecipients.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center space-y-1">
                      <Phone className="w-6 h-6 text-gray-300 mx-auto" />
                      <p className="text-xs font-semibold text-gray-700">No recipients assigned to this site yet</p>
                      <p className="text-[11px] text-gray-400">Assign an existing recipient or add a new phone number below.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                      {siteRecipients.map((item) => (
                        <div key={item.linkId} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                              {(item.recipient.label || item.recipient.phoneE164).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-gray-900">{item.recipient.label || 'No Name'}</span>
                                <code className="text-[11px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {formatPhoneDisplay(item.recipient.phoneE164)}
                                </code>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-blue-500" /> Endpoint: <strong>{item.endpoint.label || item.endpoint.localPart}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              Active
                            </span>
                            <button
                              onClick={() => handleUnlinkRecipient(item.endpoint.id, item.recipient.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition rounded-lg"
                              title="Unlink recipient from this endpoint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add / Assign Recipient to Site Form */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Assign Recipient to Site Endpoint
                    </h4>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setAssignMode('existing')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${assignMode === 'existing' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                      >
                        Select Saved
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignMode('new')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${assignMode === 'new' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                      >
                        New Recipient
                      </button>
                    </div>
                  </div>

                  {assignError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                      {assignError}
                    </div>
                  )}

                  {siteEndpoints.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      This site does not have any email endpoints yet.{' '}
                      <Link href="/endpoints/new" className="font-bold underline">Create an endpoint for this site first</Link>.
                    </div>
                  ) : (
                    <form onSubmit={handleAssignRecipient} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Target Endpoint *</label>
                        <select
                          required
                          value={selectedEndpointId}
                          onChange={(e) => setSelectedEndpointId(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {siteEndpoints.map((ep) => (
                            <option key={ep.id} value={ep.id}>
                              {ep.label} ({ep.localPart}@{ep.domain?.hostname || 'alarms.liablealerts.com'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {assignMode === 'existing' ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Select Existing Recipient *</label>
                          <select
                            required
                            value={selectedRecipientId}
                            onChange={(e) => setSelectedRecipientId(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="">Choose a saved recipient...</option>
                            {availableRecipients.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label || r.phoneE164} — {formatPhoneDisplay(r.phoneE164)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Phone Number (10 digits or E.164) *</label>
                            <input
                              required
                              type="tel"
                              value={newRecipientPhone}
                              onChange={(e) => setNewRecipientPhone(e.target.value)}
                              placeholder="305-753-7770"
                              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Recipient Name / Label</label>
                            <input
                              value={newRecipientLabel}
                              onChange={(e) => setNewRecipientLabel(e.target.value)}
                              placeholder="John Smith"
                              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={assigning || (assignMode === 'existing' && !selectedRecipientId)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                        >
                          {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          {assignMode === 'existing' ? 'Assign Recipient to Site' : 'Add & Assign Recipient'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
