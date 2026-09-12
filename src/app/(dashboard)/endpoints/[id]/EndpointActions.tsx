'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ToggleLeft, ToggleRight, Loader2, Copy, CheckCheck, Plus, Trash2, Phone, AlertCircle
} from 'lucide-react';

interface EndpointActionsProps {
  endpointId: string;
  status: 'ACTIVE' | 'INACTIVE';
  emailAddress: string;
  recipients: Array<{
    id: string;
    recipient: {
      id: string;
      phoneE164: string;
      label: string | null;
      optedOut: boolean;
    };
  }>;
}

export function EndpointActions({ endpointId, status: initialStatus, emailAddress, recipients: initialRecipients }: EndpointActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(initialStatus);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Add Recipient state
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [recipientTab, setRecipientTab] = useState<'saved' | 'new'>('saved');
  const [savedRecipients, setSavedRecipients] = useState<any[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [deletingRecipientId, setDeletingRecipientId] = useState<string | null>(null);

  const openAddRecipient = async () => {
    setShowAddRecipient(true);
    try {
      const res = await fetch('/api/recipients');
      const json = await res.json();
      setSavedRecipients(json.data || []);
    } catch (err) {
      console.error('Error fetching recipients:', err);
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    setErrorMsg('');
    const action = status === 'ACTIVE' ? 'deactivate' : 'activate';

    try {
      const res = await fetch(`/api/endpoints/${endpointId}/${action}`, { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        if (json.code === 'PLAN_LIMIT_EXCEEDED') {
          setErrorMsg('Plan limit reached. Upgrade your subscription to activate more endpoints.');
        } else {
          setErrorMsg(json.error || 'Failed to update endpoint status');
        }
        setToggling(false);
        return;
      }

      setStatus(json.data.status);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error toggling status');
    } finally {
      setToggling(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddRecipientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingRecipient(true);

    try {
      const body = recipientTab === 'saved'
        ? { recipientId: selectedRecipientId }
        : { phoneE164: newPhone.trim(), label: newLabel.trim() || undefined };

      const res = await fetch(`/api/endpoints/${endpointId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to add recipient');
        setAddingRecipient(false);
        return;
      }

      setNewPhone('');
      setNewLabel('');
      setSelectedRecipientId('');
      setShowAddRecipient(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error adding recipient');
    } finally {
      setAddingRecipient(false);
    }
  };

  const handleRemoveRecipient = async (recipientId: string) => {
    if (!confirm('Remove this SMS recipient from this email endpoint?')) return;
    setDeletingRecipientId(recipientId);

    try {
      const res = await fetch(`/api/endpoints/${endpointId}/recipients?recipientId=${recipientId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to remove recipient');
        setDeletingRecipientId(null);
        return;
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error removing recipient');
    } finally {
      setDeletingRecipientId(null);
    }
  };

  const isActive = status === 'ACTIVE';

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-800 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Header Controls: Toggle Status + Copy Address */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={handleCopyEmail}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Email Address'}
        </button>

        <button
          onClick={handleToggleStatus}
          disabled={toggling}
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 rounded-xl border text-xs sm:text-[13px] font-semibold transition-all disabled:opacity-50 ${
            isActive
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isActive ? (
            <ToggleRight className="w-5 h-5 text-green-600" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          )}
          {isActive ? 'Endpoint Active' : 'Endpoint Inactive'}
        </button>
      </div>

      {/* Inline Recipient Manager Box */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-purple-600" />
            Configured SMS Recipients ({initialRecipients.length})
          </h3>
          <button
            onClick={() => {
              if (!showAddRecipient) openAddRecipient();
              else setShowAddRecipient(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 text-[11px] font-bold rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Recipient
          </button>
        </div>

        {/* Add Recipient Form */}
        {showAddRecipient && (
          <form onSubmit={handleAddRecipientSubmit} className="p-4 bg-purple-50/40 border-b border-purple-100 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecipientTab('saved')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  recipientTab === 'saved'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-purple-200'
                }`}
              >
                Select Saved Recipient
              </button>
              <button
                type="button"
                onClick={() => setRecipientTab('new')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  recipientTab === 'new'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-purple-200'
                }`}
              >
                New Phone Number
              </button>
            </div>

            {recipientTab === 'saved' ? (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Choose Saved Recipient *
                </label>
                <select
                  required
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full border border-purple-200 bg-white rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a saved recipient...</option>
                  {savedRecipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label || r.phoneE164} ({r.phoneE164})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Phone (e.g. 305-753-7770 or +13057537770) *"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full border border-purple-200 bg-white rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="Label / Contact Name (Optional)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full border border-purple-200 bg-white rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            <p className="text-[11px] text-purple-900/80 leading-relaxed">
              Recipients must provide prior consent to receive operational alerts. Reply STOP to cancel or HELP for help. Mobile info & SMS consent will not be sold or shared for marketing purposes.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddRecipient(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingRecipient || (recipientTab === 'saved' && !selectedRecipientId)}
                className="px-4 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {addingRecipient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Recipient'}
              </button>
            </div>
          </form>
        )}

        {/* List of Recipients */}
        {initialRecipients.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <Phone className="w-7 h-7 text-gray-200 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400">No phone recipients assigned to this endpoint.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {initialRecipients.map((er) => (
              <div key={er.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center text-purple-700 font-bold text-[11px]">
                    {(er.recipient.label || er.recipient.phoneE164).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">
                      {er.recipient.label || er.recipient.phoneE164}
                    </p>
                    {er.recipient.label && (
                      <p className="text-[11px] font-mono text-gray-400">{er.recipient.phoneE164}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {er.recipient.optedOut && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Opted Out</span>
                  )}
                  <button
                    onClick={() => handleRemoveRecipient(er.recipient.id)}
                    disabled={deletingRecipientId === er.recipient.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove recipient"
                  >
                    {deletingRecipientId === er.recipient.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SMS Segment Reminder */}
        <div className="px-5 py-2.5 bg-gray-50/80 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
          <strong>Note:</strong> Messages are counted per segment (up to 160 characters). If an alert exceeds 160 characters and splits into 2 segments, it counts as 2 messages per recipient.
        </div>
      </div>
    </div>
  );
}
