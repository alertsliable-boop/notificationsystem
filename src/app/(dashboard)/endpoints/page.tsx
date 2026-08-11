'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Mail, Copy, CheckCheck, ToggleLeft, ToggleRight, Loader2, Search, Filter, TrendingUp, Activity, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Endpoint {
  id: string;
  label: string | null;
  localPart: string;
  status: 'ACTIVE' | 'INACTIVE';
  severityTag: string | null;
  domain: { hostname: string };
  customer: { name: string };
  site: { name: string };
  _count: { recipients: number; notifications: number };
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    const res = await fetch('/api/endpoints');
    const json = await res.json();
    setEndpoints(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEndpoints(); }, [fetchEndpoints]);

  const toggleStatus = async (ep: Endpoint) => {
    setToggling(ep.id);
    const action = ep.status === 'ACTIVE' ? 'deactivate' : 'activate';
    const res = await fetch(`/api/endpoints/${ep.id}/${action}`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      if (json.code === 'PLAN_LIMIT_EXCEEDED') {
        alert('Active email account limit reached for your subscription plan. Upgrade in Billing to activate more endpoints.');
      } else {
        alert(json.error || 'Failed to update status');
      }
      setToggling(null);
      return;
    }
    setEndpoints((prev) => prev.map((e) => e.id === ep.id ? { ...e, status: json.data.status } : e));
    setToggling(null);
  };

  const copyAddress = (ep: Endpoint) => {
    const addr = `${ep.localPart}@${ep.domain?.hostname || 'mail.liablealerts.com'}`;
    navigator.clipboard.writeText(addr);
    setCopied(ep.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredEndpoints = endpoints.filter(ep => {
    const matchesSearch = (ep.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.localPart.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.site?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterStatus === 'ALL') return matchesSearch;
    return matchesSearch && ep.status === filterStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate and remove this endpoint?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) { alert(json.error || 'Failed to delete endpoint'); }
    setDeletingId(null);
    fetchEndpoints();
  };

  const activeCount = endpoints.filter(e => e.status === 'ACTIVE').length;
  const totalNotifications = endpoints.reduce((sum, e) => sum + e._count.notifications, 0);

  return (
    <div className="space-y-8 animate-fadeIn py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Inbound Email Accounts</h1>
          <p className="text-gray-600 text-sm">Manage active email-to-SMS notification endpoints for equipment and sites</p>
        </div>
        <Link href="/endpoints/new">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
            Create Email Endpoint
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-100 bg-green-50/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Active Accounts</p>
                <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
                <p className="text-xs text-green-700 font-medium mt-1">Billed under active plan</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Endpoints</p>
                <p className="text-3xl font-bold text-gray-900">{endpoints.length}</p>
                <p className="text-xs text-gray-500 mt-1">{endpoints.length - activeCount} Inactive</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Processed Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{totalNotifications}</p>
                <p className="text-xs text-purple-700 font-medium mt-1">Converted to SMS</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by label, email address, customer, or site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                className="border border-gray-300 bg-white rounded-xl px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
              >
                <option value="ALL">All Statuses ({endpoints.length})</option>
                <option value="ACTIVE">Active Only ({activeCount})</option>
                <option value="INACTIVE">Inactive Only ({endpoints.length - activeCount})</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints Table */}
      <Card>
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <CardTitle className="text-lg">Inbound Endpoints ({filteredEndpoints.length})</CardTitle>
          <CardDescription>Each active endpoint receives emails and forwards SMS alerts to assigned recipients.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredEndpoints.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {searchQuery ? 'No matching endpoints found' : 'No email endpoints configured yet'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md text-sm">
                {searchQuery 
                  ? 'Try clearing or adjusting your search filters.'
                  : 'Create your first unique email account endpoint to begin capturing equipment notifications.'}
              </p>
              {!searchQuery && (
                <Link href="/endpoints/new">
                  <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                    Configure First Endpoint
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Endpoint Label</th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Inbound Email Address</th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Customer & Site</th>
                    <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">SMS Recipients</th>
                    <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Inbound Alerts</th>
                    <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEndpoints.map((ep) => {
                    const address = `${ep.localPart}@${ep.domain?.hostname || 'mail.liablealerts.com'}`;
                    const isActive = ep.status === 'ACTIVE';

                    return (
                      <tr key={ep.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <div>
                              <Link href={`/endpoints/${ep.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors block">
                                {ep.label || ep.localPart}
                              </Link>
                              {ep.severityTag && (
                                <Badge variant="warning" className="mt-1 text-[10px]">{ep.severityTag}</Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg font-mono font-medium">
                              {address}
                            </code>
                            <button 
                              onClick={() => copyAddress(ep)} 
                              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-700"
                              title="Copy full email address"
                            >
                              {copied === ep.id ? (
                                <CheckCheck className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs">
                            <p className="font-bold text-gray-900">{ep.customer?.name || '—'}</p>
                            <p className="text-gray-500 font-medium">{ep.site?.name || '—'}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant="neutral">{ep._count.recipients}</Badge>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant="info">{ep._count.notifications}</Badge>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => toggleStatus(ep)}
                              disabled={toggling === ep.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                                isActive
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {toggling === ep.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              )}
                              {isActive ? 'Active' : 'Inactive'}
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(ep.id)}
                            disabled={deletingId === ep.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                            title="Deactivate and delete endpoint"
                          >
                            {deletingId === ep.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
