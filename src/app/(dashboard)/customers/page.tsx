'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, Edit2, Trash2, Loader2, Phone, X, Mail, MapPin } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/phone';

interface Customer {
  id: string;
  name: string;
  notes: string | null;
  _count: { sites: number; endpoints: number; recipients?: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Customer Recipients Drawer State
  const [selectedCustomerForRecipients, setSelectedCustomerForRecipients] = useState<Customer | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [customerEndpoints, setCustomerEndpoints] = useState<any[]>([]);
  const [customerRecipients, setCustomerRecipients] = useState<any[]>([]);
  const [availableRecipients, setAvailableRecipients] = useState<any[]>([]);

  // Assign Recipient State in Drawer
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientLabel, setNewRecipientLabel] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load customers');
      } else {
        setCustomers(json.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notes }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Failed'); setSaving(false); return; }
    
    closeForm();
    fetchCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setName(customer.name);
    setNotes(customer.notes || '');
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) { alert(json.error || 'Failed to delete'); }
    setDeletingId(null);
    fetchCustomers();
  };

  const closeForm = () => {
    setName('');
    setNotes('');
    setShowForm(false);
    setSaving(false);
    setEditingId(null);
    setError('');
  };

  const openCustomerRecipients = async (customer: Customer) => {
    setSelectedCustomerForRecipients(customer);
    setRecipientsLoading(true);
    setAssignError('');
    setSelectedRecipientId('');
    setNewRecipientPhone('');
    setNewRecipientLabel('');

    try {
      const res = await fetch(`/api/customers/${customer.id}/recipients`);
      const json = await res.json();
      setCustomerEndpoints(json.endpoints || []);
      setCustomerRecipients(json.recipients || []);
      setAvailableRecipients(json.availableRecipients || []);
      if (json.endpoints && json.endpoints.length > 0) {
        setSelectedEndpointId(json.endpoints[0].id);
      }
    } catch (err) {
      console.error('Error loading customer recipients:', err);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleAssignRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForRecipients) return;
    setAssigning(true);
    setAssignError('');

    try {
      const body = assignMode === 'existing'
        ? { endpointId: selectedEndpointId, recipientId: selectedRecipientId }
        : { endpointId: selectedEndpointId, phone: newRecipientPhone, label: newRecipientLabel };

      const res = await fetch(`/api/customers/${selectedCustomerForRecipients.id}/recipients`, {
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

      openCustomerRecipients(selectedCustomerForRecipients);
      fetchCustomers();
    } catch (err: any) {
      setAssignError(err.message || 'Error assigning recipient');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnlinkRecipient = async (endpointId: string, recipientId: string) => {
    if (!selectedCustomerForRecipients) return;
    if (!confirm('Unlink this recipient from this customer endpoint?')) return;

    try {
      const res = await fetch(`/api/customers/${selectedCustomerForRecipients.id}/recipients?endpointId=${endpointId}&recipientId=${recipientId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        openCustomerRecipients(selectedCustomerForRecipients);
        fetchCustomers();
      }
    } catch (err) {
      console.error('Error unlinking recipient:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[32px] font-bold text-ink-black leading-tight">Customers</h1>
          <p className="text-smoke mt-1 text-sm tracking-[-0.32px] leading-[1.35]">Organize your inbound endpoints and notification recipients by customer.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center justify-center gap-2 bg-signal-blue text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-colors self-start sm:self-auto shadow-sm">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="space-y-6">

      {showForm && (
        <div className="bg-paper-white rounded-2xl shadow-subtle p-5 sm:p-6 border border-ash-mist">
          <h3 className="font-semibold mb-5 text-ink-black text-base tracking-[-0.36px]">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
          {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-smoke mb-1.5 tracking-[-0.24px]">Customer Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corporation" className="w-full border border-ash-mist bg-paper-white rounded-xl px-4 py-2.5 text-sm text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-smoke mb-1.5 tracking-[-0.24px]">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="w-full border border-ash-mist bg-paper-white rounded-xl px-4 py-2.5 text-sm text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all resize-none" rows={2} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-signal-blue text-white px-5 py-2.5 rounded-full font-semibold text-sm disabled:opacity-50 transition-opacity">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Save Changes' : 'Create Customer')}
              </button>
              <button type="button" onClick={closeForm} className="px-5 py-2.5 bg-transparent border border-ink-black text-ink-black rounded-full font-medium text-sm hover:bg-ash-mist transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-paper-white rounded-2xl shadow-subtle overflow-hidden border border-ash-mist">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-smoke" /></div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-smoke gap-3 px-4 text-center">
            <Users className="w-12 h-12 text-smoke/40" />
            <p className="text-sm tracking-[-0.28px]">No customers yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-paper-white border-b border-ash-mist">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Sites</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Endpoints</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Recipients</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-smoke uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-mist bg-paper-white">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-ash-mist/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-ink-black tracking-[-0.32px]">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-graphite tracking-[-0.28px]">
                      <Link href={`/sites?customerId=${c.id}`} className="hover:text-signal-blue underline-offset-2 hover:underline">
                        {c._count.sites} site{c._count.sites === 1 ? '' : 's'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-graphite tracking-[-0.28px]">
                      <Link href={`/endpoints?customerId=${c.id}`} className="hover:text-signal-blue underline-offset-2 hover:underline">
                        {c._count.endpoints} endpoint{c._count.endpoints === 1 ? '' : 's'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openCustomerRecipients(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition border border-blue-200"
                        title="Click to view all recipients for this customer"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{c._count.recipients || 0} recipient{c._count.recipients === 1 ? '' : 's'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-smoke tracking-[-0.28px] max-w-xs truncate">{c.notes || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openCustomerRecipients(c)}
                          className="p-2 text-smoke hover:text-blue-600 transition-colors"
                          title="View Customer Recipients"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(c)} className="p-2 text-smoke hover:text-signal-blue transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="p-2 text-smoke hover:text-red-500 transition-colors disabled:opacity-50">
                          {deletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

      {/* Customer Recipients Drawer / Modal */}
      {selectedCustomerForRecipients && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 relative space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600"><Users className="w-5 h-5" /></span>
                <div>
                  <h3 className="font-bold text-[18px] text-gray-900 leading-tight">
                    Customer Recipients — {selectedCustomerForRecipients.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Viewing all alert recipients configured across sites and endpoints for {selectedCustomerForRecipients.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerForRecipients(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recipientsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Section 1: Assigned Recipients List */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Active Alert Recipients ({customerRecipients.length})
                  </h4>

                  {customerRecipients.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center space-y-2">
                      <Phone className="w-7 h-7 text-gray-300 mx-auto" />
                      <p className="text-sm font-semibold text-gray-700">No recipients configured for this customer yet</p>
                      <p className="text-xs text-gray-400">
                        {customerEndpoints.length === 0
                          ? 'This customer does not have any email endpoints yet. Create an endpoint first to route alerts.'
                          : 'Assign an alert recipient to one of this customer’s endpoints below.'}
                      </p>
                      {customerEndpoints.length === 0 && (
                        <div className="pt-2">
                          <Link
                            href={`/endpoints/new`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Create First Endpoint for Customer →
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                      {customerRecipients.map((item) => (
                        <div key={item.linkId} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                              {(item.recipient.label || item.recipient.phoneE164).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-gray-900">{item.recipient.label || 'No Name'}</span>
                                <code className="text-[11px] font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                  {formatPhoneDisplay(item.recipient.phoneE164)}
                                </code>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  Site: <strong>{item.endpoint.site?.name || 'Site'}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-blue-500" />
                                  Endpoint: <strong>{item.endpoint.label || item.endpoint.localPart}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              Active
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnlinkRecipient(item.endpoint.id, item.recipient.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition"
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

                {/* Section 2: Assign / Add Recipient to Endpoint Form */}
                {customerEndpoints.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      Assign Recipient to Customer Endpoint
                    </h4>

                    {assignError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                        {assignError}
                      </div>
                    )}

                    <form onSubmit={handleAssignRecipient} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Target Endpoint *</label>
                        <select
                          required
                          value={selectedEndpointId}
                          onChange={(e) => setSelectedEndpointId(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {customerEndpoints.map((ep) => (
                            <option key={ep.id} value={ep.id}>
                              {ep.label || ep.localPart} {ep.site?.name ? `(${ep.site.name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-4 text-xs font-semibold">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="custAssignMode"
                            checked={assignMode === 'existing'}
                            onChange={() => setAssignMode('existing')}
                            className="text-blue-600"
                          />
                          Choose Existing Recipient
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="custAssignMode"
                            checked={assignMode === 'new'}
                            onChange={() => setAssignMode('new')}
                            className="text-blue-600"
                          />
                          Add New Phone Number
                        </label>
                      </div>

                      {assignMode === 'existing' ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Select Recipient *</label>
                          <select
                            value={selectedRecipientId}
                            onChange={(e) => setSelectedRecipientId(e.target.value)}
                            required={assignMode === 'existing'}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="">Select a recipient from company...</option>
                            {availableRecipients.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label ? `${r.label} (${r.phoneE164})` : r.phoneE164}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Phone Number (10 digits or E.164) *</label>
                            <input
                              required={assignMode === 'new'}
                              type="tel"
                              value={newRecipientPhone}
                              onChange={(e) => setNewRecipientPhone(e.target.value)}
                              placeholder="305-753-7770"
                              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
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
                          {assignMode === 'existing' ? 'Assign Recipient to Customer' : 'Add & Assign Recipient'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
