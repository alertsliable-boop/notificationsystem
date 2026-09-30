'use client';

import { useState } from 'react';
import { Mail, Loader2, Trash2, Plus, CheckCircle2, AlertCircle, Info, Send, KeyRound, X, Edit3 } from 'lucide-react';

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

  const handleResendToExisting = async (resetPassword: boolean = true) => {
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
              onClick={() => handleResendToExisting(true)}
              disabled={resendingExisting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {resendingExisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Resend with Fresh Password
            </button>
            <button
              type="button"
              onClick={() => handleResendToExisting(false)}
              disabled={resendingExisting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-800 rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              Resend with Existing Login
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
  memberName,
}: {
  membershipId: string;
  memberEmail: string;
  memberName?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState(memberEmail);
  const [name, setName] = useState(memberName || '');
  const [resetPassword, setResetPassword] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleOpen = () => {
    setEmail(memberEmail);
    setName(memberName || '');
    setResetPassword(true);
    setError('');
    setSuccess('');
    setGeneratedPassword('');
    setCopied(false);
    setModalOpen(true);
  };

  const handleClose = () => {
    if (sending) return;
    setModalOpen(false);
    if (success) {
      window.location.reload();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');
    setGeneratedPassword('');

    try {
      const res = await fetch(`/api/team/${membershipId}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          resetPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to send invite');
        setSending(false);
        return;
      }

      setSuccess(json.message || `Invitation sent to ${email}!`);
      if (json.tempPassword) {
        setGeneratedPassword(json.tempPassword);
      }
      setSending(false);
    } catch (err: any) {
      setError(err.message || 'Error sending invite');
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-lg transition-all shadow-2xs"
        title={`Resend invitation to ${memberEmail}`}
      >
        <Send className="w-3.5 h-3.5 text-blue-600" />
        <span>Resend Invite</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Resend Workspace Invitation</h3>
                  <p className="text-[11px] text-gray-500">Delivered directly via Resend email service</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {success ? (
                <div className="space-y-4 py-1">
                  <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-green-800">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{success}</span>
                    </div>
                  </div>

                  {generatedPassword && (
                    <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                        <span>New Temporary Password:</span>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2">
                        <code className="font-mono text-sm font-bold text-blue-900 tracking-wider">
                          {generatedPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPassword);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2500);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-[11px] text-blue-700 leading-normal">
                        This password was also sent directly inside the invitation email to <strong>{email}</strong>.
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Important Delivery Note</p>
                      <p className="mt-0.5 text-amber-700 leading-relaxed">
                        If <strong>{email}</strong> does not see the invite in their primary inbox, please have them check their <strong>Junk Email</strong> or <strong>Spam</strong> folder and mark it as <em>&quot;Not Junk&quot;</em>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jamaal Smilde"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@liablecontrols.com"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Verify spelling carefully (e.g. <code>jsmilde</code> vs <code>jsmikle</code>). You can correct any typo here before sending.
                    </p>
                  </div>

                  {/* Password Reset Section */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      <span>Password Reset Option</span>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resetPassword}
                        onChange={(e) => setResetPassword(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                      />
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          Generate fresh temporary password on resend
                        </p>
                        <p className="text-[11px] text-gray-600 leading-normal mt-0.5">
                          Sets a new temporary password and includes it directly inside the email so the user can log in immediately without needing password recovery.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={sending}
                      className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-xs"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {sending ? 'Sending via Resend...' : 'Send Invitation Now'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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
