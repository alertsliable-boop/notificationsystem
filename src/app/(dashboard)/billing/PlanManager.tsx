'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, ArrowUpCircle, TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';

interface ActiveEndpointItem {
  id: string;
  label: string | null;
  localPart: string;
  domain?: { hostname: string };
  createdAt: string;
}

interface PlanManagerProps {
  planCode: string;
  planName: string;
  currentPrice: number;
  newPrice: number;
  isCurrent: boolean;
}

export function SwitchPlanButton({ planCode, planName, currentPrice, newPrice, isCurrent }: PlanManagerProps) {
  const [loading, setLoading] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [activeEndpoints, setActiveEndpoints] = useState<ActiveEndpointItem[]>([]);
  const [selectedToDeactivate, setSelectedToDeactivate] = useState<string[]>([]);
  const [requiredCount, setRequiredCount] = useState(0);
  const [modalError, setModalError] = useState('');

  const isUpgrade = currentPrice < newPrice;

  const handleSwitch = async (deactivateIds: string[] = []) => {
    setLoading(true);
    setModalError('');

    try {
      // First attempt switch-plan directly
      const res = await fetch('/api/billing/switch-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode,
          deactivateEndpointIds: deactivateIds,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.code === 'DOWNGRADE_REDUNDANT_ENDPOINTS') {
          // Open modal to let user pick endpoints to deactivate
          setActiveEndpoints(json.activeEndpoints || []);
          setRequiredCount(json.requiredDeactivations || 1);
          setShowDowngradeModal(true);
          setLoading(false);
          return;
        }

        alert(json.error || 'Failed to switch subscription plan');
        setLoading(false);
        return;
      }

      // Check if Stripe Checkout URL was provided or instant switch success
      if (json.url) {
        window.location.href = json.url;
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while switching plans');
      setLoading(false);
    }
  };

  const handleToggleDeactivateSelect = (id: string) => {
    if (selectedToDeactivate.includes(id)) {
      setSelectedToDeactivate(selectedToDeactivate.filter((item) => item !== id));
    } else {
      setSelectedToDeactivate([...selectedToDeactivate, id]);
    }
  };

  const handleConfirmDowngradeWithDeactivation = async () => {
    if (selectedToDeactivate.length < requiredCount) {
      setModalError(`Please select at least ${requiredCount} endpoint(s) to deactivate.`);
      return;
    }
    setModalError('');
    await handleSwitch(selectedToDeactivate);
    setShowDowngradeModal(false);
  };

  if (isCurrent) {
    return (
      <Button variant="outline" disabled className="w-full">
        Current Active Plan
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={isUpgrade ? 'primary' : 'outline'}
        className="w-full"
        onClick={() => handleSwitch([])}
        disabled={loading}
        icon={
          loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isUpgrade ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <ArrowUpCircle className="w-4 h-4" />
          )
        }
      >
        {loading ? 'Processing...' : isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan'}
      </Button>

      {/* Downgrade Compliance Deactivation Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-ash-mist relative space-y-5">
            <div className="flex items-center justify-between border-b border-ash-mist pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-ink-black">Deactivate Surplus Endpoints</h3>
                  <p className="text-[12px] text-smoke">Required for plan downgrade</p>
                </div>
              </div>
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="p-2 text-smoke hover:text-ink-black rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-[13px] text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">Quota Enforcement Rule</p>
              Your new <strong>{planName}</strong> plan limit requires you to deactivate at least{' '}
              <strong className="text-amber-800">{requiredCount}</strong> active endpoint(s) so your total active count fits within the licensed limit.
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {modalError}
              </div>
            )}

            <div>
              <p className="text-[12px] font-semibold text-graphite uppercase tracking-wider mb-2">
                Select Endpoints to Deactivate ({selectedToDeactivate.length}/{requiredCount} selected):
              </p>

              <div className="max-h-60 overflow-y-auto divide-y divide-ash-mist/50 border border-ash-mist rounded-xl">
                {activeEndpoints.map((ep) => {
                  const isSelected = selectedToDeactivate.includes(ep.id);
                  const addr = `${ep.localPart}@${ep.domain?.hostname || 'mail.liablealerts.com'}`;

                  return (
                    <div
                      key={ep.id}
                      onClick={() => handleToggleDeactivateSelect(ep.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/50' : 'hover:bg-ash-mist/20'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-[13px] font-bold text-ink-black truncate">{ep.label || ep.localPart}</p>
                        <code className="text-[11px] font-mono text-signal-blue truncate block">{addr}</code>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-smoke/40 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDowngradeModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDowngradeWithDeactivation}
                disabled={loading || selectedToDeactivate.length < requiredCount}
                icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {loading ? 'Deactivating...' : `Deactivate ${selectedToDeactivate.length} & Switch`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
