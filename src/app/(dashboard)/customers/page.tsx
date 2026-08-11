'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, Edit2, Trash2, Loader2 } from 'lucide-react';

interface Customer { id: string; name: string; notes: string | null; _count: { sites: number; endpoints: number }; }

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

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const json = await res.json();
    setCustomers(json.data || []);
    setLoading(false);
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

  return (
    <div className="space-y-[80px] max-w-5xl py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[36px] font-serif font-normal text-ink-black leading-none">Customers</h1>
          <p className="text-smoke mt-4 text-[16px] tracking-[-0.32px] leading-[1.35]">Organize your inbound endpoints by customer.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-signal-blue text-white px-[24px] py-[14px] rounded-[50px] font-semibold text-[16px] transition-colors">
          <Plus className="w-5 h-5" /> Add Customer
        </button>
      </div>

      <div className="space-y-6">

      {showForm && (
        <div className="bg-paper-white rounded-[22px] shadow-subtle p-[24px] border border-ash-mist">
          <h3 className="font-semibold mb-6 text-ink-black text-[18px] tracking-[-0.36px]">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
          {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg text-[14px] mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1.5 tracking-[-0.24px]">Customer Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corporation" className="w-full border border-ash-mist bg-paper-white rounded-[12px] px-4 py-2.5 text-[16px] text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1.5 tracking-[-0.24px]">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="w-full border border-ash-mist bg-paper-white rounded-[12px] px-4 py-2.5 text-[16px] text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all resize-none" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-signal-blue text-white px-[24px] py-[12px] rounded-[50px] font-semibold text-[14px] disabled:opacity-50 transition-opacity">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Save Changes' : 'Create Customer')}
              </button>
              <button type="button" onClick={closeForm} className="px-[22px] py-[12px] bg-transparent border-[1.5px] border-ink-black text-ink-black rounded-[50px] font-medium text-[14px] hover:bg-ash-mist transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-paper-white rounded-[22px] shadow-subtle overflow-hidden border border-ash-mist">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-smoke" /></div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-smoke gap-3">
            <Users className="w-12 h-12 text-smoke/40" />
            <p className="text-[14px] tracking-[-0.28px]">No customers yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-paper-white border-b border-ash-mist">
              <tr>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Sites</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Endpoints</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Notes</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-mist bg-paper-white">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-ash-mist/50 transition-colors">
                  <td className="px-6 py-5 text-[16px] font-medium text-ink-black tracking-[-0.32px]">{c.name}</td>
                  <td className="px-6 py-5 text-[14px] text-graphite tracking-[-0.28px]">{c._count.sites}</td>
                  <td className="px-6 py-5 text-[14px] text-graphite tracking-[-0.28px]">{c._count.endpoints}</td>
                  <td className="px-6 py-5 text-[14px] text-smoke tracking-[-0.28px] max-w-xs truncate">{c.notes || '—'}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
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
        )}
      </div>
      </div>
    </div>
  );
}
