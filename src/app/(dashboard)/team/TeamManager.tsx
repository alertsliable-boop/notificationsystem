'use client';

import { useState } from 'react';
import { Mail, Loader2, Trash2, Plus, CheckCircle2, AlertCircle, Info, Send, RefreshCw, KeyRound } from 'lucide-react';

export function TeamInviteForm({ onAdd }: { onAdd?: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [existingUser, setExistingUser] = useState<{ email: string; membershipId?: string } | null>(null);
  const [resendingExisting, setResendingExisting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    setExistingUser(null);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.isExisting) {
          setExistingUser({ email: json.userEmail || email.trim(), membershipId: json.membershipId });
        }
        setError(json.error || 'Failed to add member');
        setSaving(false);
        return;
      }

      const invitedEmail = email;
      setEmail('');
      setRole('MEMBER');
      setSaving(false);
      setSuccessMsg(json.message || `Invitation sent to ${invitedEmail}!`);
      if (onAdd) onAdd();
      setTimeout(() => {
        window.location.reload();
      }, 3500);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while sending the invite');
      setSaving(false);
    }
  };

  const handleResendToExisting = async (resetPassword: boolean = false) => {
    if (!existingUser) return;
    setResendingExisting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: existingUser.email,
          role,
          resend: true,
          resetPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to resend invitation email');
        setResendingExisting(false);
        return;
      }

      setSuccessMsg(json.message || `Invitation successfully resent to ${existingUser.email}!`);
      setExistingUser(null);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Error resending invitation');
    } finally {
      setResendingExisting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-bold text-gray-900 mb-1">Add Team Member</h3>
          <p className="text-[13px] text-gray-600 mb-2">
            Invite a new member to your workspace by entering their email address. They will receive an email invitation delivered through Resend with their sign-in credentials.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100/70 border border-blue-200/80 rounded-lg text-[12px] text-blue-800 font-medium">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
            <span>Please have the newly invited member check their junk mail or spam folder if they do not see the invite in their inbox.</span>
          </div>
        </div>
      </div>
      
      {error && !existingUser && (
        <div className="text-red-600 bg-red-50 border border-red-200 p-3.5 rounded-xl text-[13px] mb-4 flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {existingUser && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-[13px] mb-4 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-2.5 text-amber-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">
                <strong>{existingUser.email}</strong> is already a member of this workspace.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Did they lose their invitation email or need fresh login instructions? You can resend the invite now.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 pl-6">
            <button
              type="button"
              onClick={() => handleResendToExisting(false)}
              disabled={resendingExisting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {resendingExisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Resend Invite Email
            </button>
            <button
              type="button"
              onClick={() => handleResendToExisting(true)}
              disabled={resendingExisting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-800 rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              Reset Password & Resend
            </button>
            <button
              type="button"
              onClick={() => setExistingUser(null)}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {successMsg && (
        <div className="text-green-800 bg-green-50 border border-green-200 p-4 rounded-xl text-[13px] mb-4 space-y-1.5 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-green-800">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <p className="text-[12px] text-green-700 font-medium pl-6">
            📨 <strong>Reminder:</strong> Please advise the recipient to check their spam or junk folder if not visible immediately in their inbox.
          </p>
        </div>
      )}
      
      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Email Address
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
              if (existingUser) setExistingUser(null);
            }}
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
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white h-[38px] px-5 rounded-xl font-semibold text-[13px] hover:bg-blue-700 transition-colors disabled:opacity-50 w-full sm:w-auto shadow-xs"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Member
        </button>
      </form>
    </div>
  );
}

export function ResendInviteButton({
  membershipId,
  memberEmail,
}: {
  membershipId: string;
  memberEmail: string;
}) {
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const handleResend = async (resetPassword: boolean = false) => {
    setResending(true);
    setStatus('idle');
    setFeedback('');

    try {
      const res = await fetch(`/api/team/${membershipId}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to resend invite');
        setStatus('error');
        setResending(false);
        return;
      }

      setStatus('success');
      setFeedback('Invite resent!');
      setTimeout(() => {
        setStatus('idle');
        setFeedback('');
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Error resending invite');
      setStatus('error');
    } finally {
      setResending(false);
    }
  };

  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
        {feedback || 'Invite Resent!'}
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const wantsReset = confirm(
          `Resend invitation email to ${memberEmail}?\n\nClick OK to resend with existing credentials, or Cancel to abort.\n(If they need a brand-new temporary password generated, choose to reset in the Add Member form above.)`
        );
        if (wantsReset) {
          handleResend(false);
        }
      }}
      disabled={resending}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-lg transition-all disabled:opacity-50"
      title={`Resend invitation email to ${memberEmail}`}
    >
      {resending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
      ) : (
        <Send className="w-3.5 h-3.5 text-gray-500" />
      )}
      <span>Resend Invite</span>
    </button>
  );
}

export function RemoveMemberButton({ id, disabled }: { id: string; disabled: boolean }) {
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
      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
      title="Remove member"
    >
      {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
