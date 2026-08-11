'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, Edit2, Trash2 } from 'lucide-react';

interface Site { id: string; name: string; address: string | null; customerId: string; customer: { id: string, name: string }; _count: { endpoints: number }; }
interface Customer { id: string; name: string; }

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
    setCustomerId(site.customer.id || ''); 
    // Note: the original code just had customer { name }, we need the ID to pre-select it. Wait, the Site interface above says `customer: { name: string }`. I need to change it to include id.
    // Let me fix the interface above in another chunk.
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

  return (
    <div className="space-y-[80px] max-w-5xl py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[36px] font-serif font-normal text-ink-black leading-none">Sites</h1>
          <p className="text-smoke mt-4 text-[16px] tracking-[-0.32px] leading-[1.35]">Assign physical locations to customers and endpoints.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-signal-blue text-white px-[24px] py-[14px] rounded-[50px] font-semibold text-[16px] transition-colors">
          <Plus className="w-5 h-5" /> Add Site
        </button>
      </div>

      <div className="space-y-6">

      {showForm && (
        <div className="bg-paper-white rounded-[22px] shadow-subtle p-[24px]">
          <h3 className="font-semibold mb-6 text-ink-black text-[18px] tracking-[-0.36px]">{editingId ? 'Edit Site' : 'New Site'}</h3>
          {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg text-[14px] mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1.5 tracking-[-0.24px]">Site Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="North Building" className="w-full border border-ash-mist bg-paper-white rounded-[12px] px-4 py-2.5 text-[16px] text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1.5 tracking-[-0.24px]">Customer *</label>
              <select required value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-ash-mist bg-paper-white rounded-[12px] px-4 py-2.5 text-[16px] text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all">
                <option value="">Select a customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-smoke mb-1.5 tracking-[-0.24px]">Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, State" className="w-full border border-ash-mist bg-paper-white rounded-[12px] px-4 py-2.5 text-[16px] text-graphite outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue transition-all" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-signal-blue text-white px-[24px] py-[12px] rounded-[50px] font-semibold text-[14px] disabled:opacity-50 transition-opacity">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Save Changes' : 'Create Site')}
              </button>
              <button type="button" onClick={closeForm} className="px-[22px] py-[12px] bg-transparent border-[1.5px] border-ink-black text-ink-black rounded-[50px] font-medium text-[14px] hover:bg-ash-mist transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-paper-white rounded-[22px] shadow-subtle overflow-hidden border border-ash-mist">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-smoke" /></div> :
         sites.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-smoke gap-3">
            <MapPin className="w-12 h-12 text-smoke/40" />
            <p className="text-[14px] tracking-[-0.28px]">No sites yet. Add a site to organize your endpoints.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-paper-white border-b border-ash-mist">
              <tr>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Site</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider">Endpoints</th>
                <th className="px-6 py-4 text-[12px] font-medium text-smoke uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-mist bg-paper-white">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-ash-mist/50 transition-colors">
                  <td className="px-6 py-5 text-[16px] font-medium text-ink-black tracking-[-0.32px]">{s.name}</td>
                  <td className="px-6 py-5 text-[14px] text-graphite tracking-[-0.28px]">{s.customer.name}</td>
                  <td className="px-6 py-5 text-[14px] text-smoke tracking-[-0.28px]">{s.address || '—'}</td>
                  <td className="px-6 py-5 text-[14px] text-smoke tracking-[-0.28px]">{s._count.endpoints}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
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
        )}
      </div>
      </div>
    </div>
  );
}
