'use client';

import { useState } from 'react';
import { Mail, Loader2, Trash2, Plus } from 'lucide-react';

export function TeamInviteForm({ onAdd }: { onAdd?: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Failed to add member');
      setSaving(false);
      return;
    }

    setEmail('');
    setRole('MEMBER');
    setSaving(false);
    if (onAdd) onAdd();
    window.location.reload(); // simple way to refresh the server component data
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-bold text-gray-900 mb-1">Add Team Member</h3>
          <p className="text-[13px] text-gray-600">
            Invite a new member to your workspace by entering their email address.
          </p>
        </div>
      </div>
      
      {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg text-[13px] mb-4">{error}</div>}
      
      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Email Address
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
            <option value="BILLING">Billing</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white h-[38px] px-5 rounded-xl font-semibold text-[13px] hover:bg-blue-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Member
        </button>
      </form>
    </div>
  );
}

export function RemoveMemberButton({ id, disabled }: { id: string, disabled: boolean }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setRemoving(true);
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Failed to remove member');
      setRemoving(false);
      return;
    }
    window.location.reload();
  };

  return (
    <button
      onClick={handleRemove}
      disabled={disabled || removing}
      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
      title="Remove member"
    >
      {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
