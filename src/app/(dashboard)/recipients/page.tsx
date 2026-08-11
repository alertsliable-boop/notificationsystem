'use client';

import { useState, useEffect, useCallback } from 'react';
import { Phone, Plus, Trash2, Loader2, Search, CheckCircle2, XCircle, Copy, CheckCheck, Edit2 } from 'lucide-react';

interface Recipient {
  id: string;
  phoneE164: string;
  label: string | null;
  optedOut: boolean;
  _count: { endpoints: number };
}

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [phoneE164, setPhoneE164] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchRecipients = useCallback(async () => {
    const res = await fetch('/api/recipients');
    const json = await res.json();
    setRecipients(json.data || []);
    setLoading(false);
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
      : JSON.stringify({ phoneE164, label });

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
    setShowForm(true);
  };

  const closeForm = () => {
    setPhoneE164(''); 
    setLabel(''); 
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

  const filtered = recipients.filter(
    (r) =>
      r.phoneE164.includes(search) ||
      (r.label?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Phone Recipients</h1>
          <p className="text-gray-500 text-[14px] mt-1">Manage phone numbers that receive SMS alerts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-semibold text-[13px] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Add Recipient
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slideUp">
          <h3 className="font-bold text-[16px] text-gray-900 mb-5">{editingId ? 'Edit Recipient' : 'New Phone Recipient'}</h3>
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
                  Phone Number (E.164) *
                </label>
                <input
                  required
                  type="tel"
                  value={phoneE164}
                  onChange={(e) => setPhoneE164(e.target.value)}
                  placeholder="+15551234567"
                  disabled={!!editingId}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono disabled:opacity-60"
                />
                <p className="text-[11px] text-gray-400 mt-1">Must include country code (e.g., +1 for US)</p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Label / Name
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="John Smith (On-Call)"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-semibold text-[13px] disabled:opacity-50 transition-all"
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

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone number or name..."
            className="flex-1 text-[14px] text-gray-700 outline-none bg-transparent placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[12px] text-gray-400 hover:text-gray-600">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-gray-900">All Recipients ({filtered.length})</h2>
          <span className="text-[12px] text-gray-400">{recipients.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
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
            {!search && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add your first recipient
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Endpoints</th>
                  <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-[12px]">
                          {(r.label || r.phoneE164).charAt(0).toUpperCase()}
                        </div>
                        <p className="text-[14px] font-semibold text-gray-900">
                          {r.label || <span className="text-gray-400 italic">No label</span>}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-[13px] font-mono text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {r.phoneE164}
                        </code>
                        <button
                          onClick={() => copyPhone(r.phoneE164, r.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {copied === r.id ? (
                            <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded-full text-[12px] font-bold">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
