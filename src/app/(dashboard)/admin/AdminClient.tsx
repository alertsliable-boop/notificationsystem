'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Users, Building2, Mail, Send, CheckCircle2,
  AlertTriangle, XCircle, Search, RefreshCw, ChevronRight,
  Sparkles, DollarSign, Calendar, Sliders, Check, ArrowUpDown,
  ExternalLink, Clock, FileText, ToggleLeft, ToggleRight, X, AlertCircle,
  Eye, Phone, ArrowRight, UserCheck, Inbox, LogIn
} from 'lucide-react';

interface AdminClientProps {
  userEmail: string;
}

interface OverviewData {
  totalUsers: number;
  totalCompanies: number;
  totalEndpoints: number;
  activeEndpoints: number;
  inactiveEndpoints: number;
  totalRecipients: number;
  totalNotifications: number;
  totalSms: number;
  deliveredSms: number;
  failedSms: number;
  deliveryRate: number;
  estimatedMrr: string | number;
  planCounts: {
    free_trial: number;
    starter: number;
    pro: number;
    business: number;
    superadmin_owner?: number;
    [key: string]: any;
  };
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  companyId: string | null;
  companyName: string;
  companySlug: string;
  subscription: {
    id: string | null;
    planId: string | null;
    planName: string;
    planCode: string;
    maxActiveEndpoints: number;
    status: string;
    currentPeriodEnd: string | null;
    stripeSubscriptionId: string | null;
  } | null;
  activeEndpoints: number;
  totalEndpoints: number;
  totalRecipients: number;
  totalNotifications: number;
}

interface EndpointRecord {
  id: string;
  fullEmailAddress: string;
  status: string;
  companyId: string;
  companyName: string;
  siteName: string;
  customerName: string;
  recipientCount: number;
  notificationCount: number;
  createdAt: string;
}

interface SmsLogRecord {
  id: string;
  status: string;
  providerSid: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  phoneE164: string;
  recipientLabel: string;
  companyName: string;
  endpointLabel: string;
  subject: string;
  createdAt: string;
}

interface InboundAlertRecord {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  companyId: string;
  companyName: string;
  endpointLabel: string;
  endpointEmail: string;
  smsTotal: number;
  smsDelivered: number;
  smsFailed: number;
  bodyPreview: string;
  bodyText: string;
}

interface UserDetailsData {
  company: any;
  subscription: any;
  endpoints: any[];
  recipients: any[];
  notifications: any[];
  teamMembers: any[];
  smsMessages: any[];
}

const PLAN_OPTIONS = [
  { code: 'free_trial', name: 'Free Trial', price: 0, maxEndpoints: 1, badgeColor: 'bg-gray-100 text-gray-800 border-gray-200' },
  { code: 'starter', name: 'Starter Plan', price: 19, maxEndpoints: 1, badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { code: 'pro', name: 'Professional Plan', price: 59, maxEndpoints: 5, badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { code: 'business', name: 'Business Plan', price: 129, maxEndpoints: 15, badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { code: 'superadmin_owner', name: 'Platform Owner', price: 0, maxEndpoints: 999999, badgeColor: 'bg-amber-50 text-amber-900 border-amber-300' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'TRIALING', label: 'Trialing', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'PAST_DUE', label: 'Past Due', badge: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'CANCELED', label: 'Canceled', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export default function AdminClient({ userEmail }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'emails' | 'endpoints' | 'sms' | 'overview'>('users');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointRecord[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogRecord[]>([]);
  const [notifications, setNotifications] = useState<InboundAlertRecord[]>([]);

  // Search & filter states
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [emailSearch, setEmailSearch] = useState('');
  const [endpointSearch, setEndpointSearch] = useState('');
  const [smsSearch, setSmsSearch] = useState('');

  // Deep User Monitor state
  const [inspectingUser, setInspectingUser] = useState<UserRecord | null>(null);
  const [inspectingDetails, setInspectingDetails] = useState<UserDetailsData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [monitorSubTab, setMonitorSubTab] = useState<'endpoints' | 'emails' | 'recipients' | 'sms'>('endpoints');

  // Manage Plan Modal state
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [modalPlanCode, setModalPlanCode] = useState('starter');
  const [modalStatus, setModalStatus] = useState('ACTIVE');
  const [modalPeriodDays, setModalPeriodDays] = useState<number>(30);
  const [modalCustomDate, setModalCustomDate] = useState<string>('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Expandable email body state
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // Initial load
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [overviewRes, usersRes, endpointsRes, smsRes, notifRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/users'),
        fetch('/api/admin/endpoints'),
        fetch('/api/admin/sms-logs'),
        fetch('/api/admin/notifications?limit=100'),
      ]);

      const [overviewData, usersData, endpointsData, smsData, notifData] = await Promise.all([
        overviewRes.json(),
        usersRes.json(),
        endpointsRes.json(),
        smsRes.json(),
        notifRes.json(),
      ]);

      if (overviewData.success && overviewData.data) setOverview(overviewData.data);
      if (usersData.success && usersData.data) setUsers(usersData.data);
      if (endpointsData.success && endpointsData.data) setEndpoints(endpointsData.data);
      if (smsData.success && smsData.data) setSmsLogs(smsData.data);
      if (notifData.success && notifData.data) setNotifications(notifData.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setActionMessage({ type: 'error', text: 'Failed to load admin data. Please check connection.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
  };

  // Open deep monitor drawer for user
  const handleInspectUser = async (user: UserRecord) => {
    setInspectingUser(user);
    setInspectingDetails(null);
    setLoadingDetails(true);
    setMonitorSubTab('endpoints');

    try {
      const res = await fetch(`/api/admin/user-details?companyId=${user.companyId || ''}&userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setInspectingDetails(data.data);
      } else {
        throw new Error(data.error || 'Failed to load user details');
      }
    } catch (err: any) {
      console.error('User inspect error:', err);
      setActionMessage({ type: 'error', text: err.message || 'Error loading user workspace data' });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Switch workspace into user company
  const handleSwitchWorkspace = async (companyId: string) => {
    try {
      const res = await fetch('/api/admin/switch-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/dashboard';
      } else {
        throw new Error(data.error || 'Failed to switch workspace');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to switch workspace' });
    }
  };

  // Open modal for user
  const openUpgradeModal = (user: UserRecord) => {
    setSelectedUser(user);
    const currentCode = user.subscription?.planCode || 'starter';
    setModalPlanCode(currentCode);
    setModalStatus(user.subscription?.status || 'ACTIVE');
    setModalPeriodDays(30);
    setModalCustomDate('');
    setModalNotes(`Admin manual update for ${user.name || user.email}`);
  };

  // Submit plan upgrade / override
  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedUser.companyId) return;

    try {
      setModalSubmitting(true);
      const res = await fetch('/api/admin/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedUser.companyId,
          planCode: modalPlanCode,
          status: modalStatus,
          extendDays: modalPeriodDays > 0 ? modalPeriodDays : undefined,
          customPeriodEnd: modalCustomDate ? new Date(modalCustomDate).toISOString() : undefined,
          notes: modalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update subscription');
      }

      setActionMessage({
        type: 'success',
        text: `Successfully updated ${selectedUser.companyName}'s plan to ${modalPlanCode.toUpperCase()} (${modalStatus})!`,
      });

      // Update local state instantly
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === selectedUser.id) {
            const chosenPlan = PLAN_OPTIONS.find((p) => p.code === modalPlanCode);
            return {
              ...u,
              subscription: {
                ...(u.subscription || {
                  id: 'sub_admin_updated',
                  planId: null,
                  stripeSubscriptionId: null,
                }),
                status: modalStatus,
                planCode: modalPlanCode,
                planName: chosenPlan?.name || modalPlanCode,
                maxActiveEndpoints: chosenPlan?.maxEndpoints || 1,
                currentPeriodEnd: data.data?.currentPeriodEnd || u.subscription?.currentPeriodEnd || null,
              },
            };
          }
          return u;
        })
      );

      // If user is currently inspected, update inspected details as well
      if (inspectingUser && inspectingUser.id === selectedUser.id) {
        const chosenPlan = PLAN_OPTIONS.find((p) => p.code === modalPlanCode);
        setInspectingUser((prev) =>
          prev
            ? {
                ...prev,
                subscription: {
                  ...(prev.subscription || {
                    id: 'sub_admin_updated',
                    planId: null,
                    stripeSubscriptionId: null,
                  }),
                  status: modalStatus,
                  planCode: modalPlanCode,
                  planName: chosenPlan?.name || modalPlanCode,
                  maxActiveEndpoints: chosenPlan?.maxEndpoints || 1,
                  currentPeriodEnd: data.data?.currentPeriodEnd || null,
                },
              }
            : null
        );
      }

      // Close modal
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Plan upgrade error:', err);
      setActionMessage({ type: 'error', text: err.message || 'Error executing upgrade' });
    } finally {
      setModalSubmitting(false);
    }
  };

  // Toggle endpoint status
  const handleToggleEndpoint = async (endpointId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/endpoints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setEndpoints((prev) =>
          prev.map((ep) => (ep.id === endpointId ? { ...ep, status: nextStatus } : ep))
        );
        setActionMessage({
          type: 'success',
          text: `Endpoint status changed to ${nextStatus}`,
        });
      } else {
        throw new Error(data.error || 'Failed to toggle endpoint');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to toggle status' });
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = userSearch.toLowerCase();
      const matchSearch =
        !userSearch ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.companyName?.toLowerCase().includes(query);

      const matchPlan =
        planFilter === 'ALL' || u.subscription?.planCode === planFilter;

      const matchStatus =
        statusFilter === 'ALL' || u.subscription?.status === statusFilter;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [users, userSearch, planFilter, statusFilter]);

  // Filtered Notifications / Inbound Emails
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const query = emailSearch.toLowerCase();
      return (
        !emailSearch ||
        n.subject?.toLowerCase().includes(query) ||
        n.from?.toLowerCase().includes(query) ||
        n.companyName?.toLowerCase().includes(query) ||
        n.endpointEmail?.toLowerCase().includes(query) ||
        n.bodyText?.toLowerCase().includes(query)
      );
    });
  }, [notifications, emailSearch]);

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const query = endpointSearch.toLowerCase();
      return (
        !endpointSearch ||
        ep.fullEmailAddress?.toLowerCase().includes(query) ||
        ep.companyName?.toLowerCase().includes(query) ||
        ep.siteName?.toLowerCase().includes(query) ||
        ep.customerName?.toLowerCase().includes(query)
      );
    });
  }, [endpoints, endpointSearch]);

  // Filtered SMS Logs
  const filteredSmsLogs = useMemo(() => {
    return smsLogs.filter((log) => {
      const query = smsSearch.toLowerCase();
      return (
        !smsSearch ||
        log.phoneE164?.toLowerCase().includes(query) ||
        log.companyName?.toLowerCase().includes(query) ||
        log.status?.toLowerCase().includes(query) ||
        (log.providerSid && log.providerSid.toLowerCase().includes(query)) ||
        log.recipientLabel?.toLowerCase().includes(query) ||
        log.endpointLabel?.toLowerCase().includes(query)
      );
    });
  }, [smsLogs, smsSearch]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Platform Owner • Full Master Access
              </span>
              <span className="text-xs text-slate-400">
                Admin Account: <strong className="text-white">{userEmail}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Superadmin Command Center
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Monitor all platform users, observe inbound email alerts, inspect workspaces, and manage subscription quotas with live overrides.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-sm font-medium border border-white/10 transition shadow-sm backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Live Data</span>
            </button>
          </div>
        </div>

        {/* Global Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Users</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">
              {overview?.totalUsers ?? '...'}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Workspaces</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">
              {overview?.totalCompanies ?? '...'}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Endpoints</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
              {overview?.activeEndpoints ?? '...'}
              <span className="text-xs font-normal text-slate-400 ml-1">/ {overview?.totalEndpoints ?? '...'}</span>
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">SMS Dispatched</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">
              {overview?.totalSms ?? '...'}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">SMS Delivery Rate</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-300 mt-1">
              {overview?.deliveryRate ?? 100}%
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Estimated MRR</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
              ${overview?.estimatedMrr ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-semibold">{actionMessage.text}</p>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Workspaces</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            activeTab === 'emails'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Live Inbound Emails</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {notifications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('endpoints')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            activeTab === 'endpoints'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Inbound Endpoints</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {endpoints.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            activeTab === 'sms'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>SMS Audit Logs</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {smsLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Platform MRR & Metrics</span>
        </button>
      </div>

      {/* TAB 1: USERS & WORKSPACES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name, email, or company workspace..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Plans</option>
                <option value="free_trial">Free Trial</option>
                <option value="starter">Starter Plan</option>
                <option value="pro">Professional Plan</option>
                <option value="business">Business Plan</option>
                <option value="superadmin_owner">Platform Owner</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIALING">TRIALING</option>
                <option value="PAST_DUE">PAST_DUE</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">User & Workspace</th>
                    <th className="py-3.5 px-4">Plan</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Endpoints</th>
                    <th className="py-3.5 px-4">SMS Sent</th>
                    <th className="py-3.5 px-4">Renewal</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading platform users and activity...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isOwnerUser = user.subscription?.planCode === 'superadmin_owner';
                      const planBadge =
                        PLAN_OPTIONS.find((p) => p.code === user.subscription?.planCode)?.badgeColor ||
                        'bg-gray-100 text-gray-700 border-gray-200';
                      const statusBadge =
                        STATUS_OPTIONS.find((s) => s.value === user.subscription?.status)?.badge ||
                        'bg-gray-100 text-gray-700 border-gray-200';

                      const activeEp = user.activeEndpoints;
                      const maxEp = user.subscription?.maxActiveEndpoints || 1;
                      const isAtMax = activeEp >= maxEp && !isOwnerUser;

                      return (
                        <tr key={user.id} className="hover:bg-gray-50/70 transition-colors group">
                          {/* User & Company */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                                {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                                  <span>{user.name || 'Anonymous User'}</span>
                                  {isOwnerUser && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                      OWNER
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Building2 className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-indigo-600 font-medium truncate">
                                    {user.companyName || 'No Workspace'}
                                  </span>
                                  {user.role && (
                                    <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                                      {user.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${planBadge}`}
                            >
                              <Sparkles className="w-3 h-3" />
                              {user.subscription?.planName || 'Starter Plan'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge}`}
                            >
                              {user.subscription?.status || 'ACTIVE'}
                            </span>
                            {user.subscription?.stripeSubscriptionId && (
                              <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[110px]" title={user.subscription.stripeSubscriptionId}>
                                Stripe: {user.subscription.stripeSubscriptionId.slice(0, 8)}...
                              </p>
                            )}
                          </td>

                          {/* Endpoint Usage */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${isAtMax ? 'text-amber-600' : 'text-gray-900'}`}>
                                {activeEp} / {isOwnerUser ? '∞' : maxEp}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                ({user.totalEndpoints} total)
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isAtMax ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${Math.min((activeEp / (isOwnerUser ? 100 : maxEp)) * 100, 100)}%` }}
                              />
                            </div>
                          </td>

                          {/* Notifications */}
                          <td className="py-4 px-4">
                            <span className="font-semibold text-gray-900">
                              {user.totalNotifications}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">alerts</span>
                          </td>

                          {/* Period End */}
                          <td className="py-4 px-4 text-xs text-gray-500">
                            {user.subscription?.currentPeriodEnd ? (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>
                                  {new Date(user.subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {/* Monitor Button */}
                              <button
                                onClick={() => handleInspectUser(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition active:scale-95"
                                title="Monitor user emails, endpoints, and live activity"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Monitor</span>
                              </button>

                              {/* Manage Plan Button */}
                              <button
                                onClick={() => openUpgradeModal(user)}
                                disabled={!user.companyId}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition active:scale-95 disabled:opacity-50"
                                title="Override plan, extend expiry, or adjust status"
                              >
                                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Plan</span>
                              </button>

                              {/* Switch Workspace */}
                              {user.companyId && (
                                <button
                                  onClick={() => handleSwitchWorkspace(user.companyId!)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition"
                                  title="Open live dashboard as this workspace"
                                >
                                  <LogIn className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE INBOUND EMAILS FEED */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="Search incoming alerts by subject, sender, workspace, or endpoint email..."
              className="w-full text-sm focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Timestamp</th>
                    <th className="py-3.5 px-4">Workspace & Endpoint</th>
                    <th className="py-3.5 px-4">From Sender</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">SMS Dispatched</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredNotifications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No inbound alerts found matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredNotifications.map((notif) => (
                      <React.Fragment key={notif.id}>
                        <tr className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-4 px-4 sm:px-6 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(notif.receivedAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold text-gray-900 text-xs">{notif.companyName}</p>
                            <p className="text-[11px] font-mono text-indigo-600 truncate max-w-[200px]" title={notif.endpointEmail}>
                              {notif.endpointEmail}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-xs font-mono text-gray-700 truncate max-w-[180px]" title={notif.from}>
                            {notif.from}
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-gray-900">
                            {notif.subject}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                              <Send className="w-3 h-3 text-indigo-600" />
                              {notif.smsDelivered}/{notif.smsTotal} delivered
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setExpandedEmailId(expandedEmailId === notif.id ? null : notif.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>{expandedEmailId === notif.id ? 'Hide' : 'Preview'}</span>
                            </button>
                          </td>
                        </tr>
                        {expandedEmailId === notif.id && (
                          <tr className="bg-slate-50 border-b border-gray-200">
                            <td colSpan={6} className="p-4 sm:px-6">
                              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
                                  <span>Raw Inbound Email Content:</span>
                                  <span className="font-mono text-[11px]">{notif.endpointEmail}</span>
                                </div>
                                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  {notif.bodyText || '(Empty message body)'}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INBOUND ENDPOINTS */}
      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={endpointSearch}
              onChange={(e) => setEndpointSearch(e.target.value)}
              placeholder="Search by endpoint email, workspace, site, or customer..."
              className="w-full text-sm focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Inbound Email Address</th>
                    <th className="py-3.5 px-4">Workspace</th>
                    <th className="py-3.5 px-4">Site / Customer</th>
                    <th className="py-3.5 px-4">Recipients</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Quick Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredEndpoints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No endpoints found.
                      </td>
                    </tr>
                  ) : (
                    filteredEndpoints.map((ep) => (
                      <tr key={ep.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-mono text-xs font-semibold text-gray-900">
                          {ep.fullEmailAddress}
                        </td>
                        <td className="py-4 px-4 text-gray-700 font-medium">
                          {ep.companyName}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-500">
                          <p className="font-semibold text-gray-800">{ep.siteName}</p>
                          <p className="text-gray-400">{ep.customerName}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                            {ep.recipientCount} SMS recipients
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              ep.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {ep.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleToggleEndpoint(ep.id, ep.status)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border hover:bg-gray-50 transition"
                          >
                            {ep.status === 'ACTIVE' ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-emerald-600" />
                                <span className="text-gray-700">Disable</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                                <span className="text-indigo-600 font-bold">Activate</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SMS AUDIT LOGS */}
      {activeTab === 'sms' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={smsSearch}
              onChange={(e) => setSmsSearch(e.target.value)}
              placeholder="Search by phone number, workspace, or provider SID..."
              className="w-full text-sm focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Timestamp</th>
                    <th className="py-3.5 px-4">Workspace</th>
                    <th className="py-3.5 px-4">Recipient Phone</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Provider SID / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredSmsLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        No SMS logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredSmsLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6 text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-800">
                          {log.companyName}
                          <p className="text-xs text-gray-400 font-normal">{log.endpointLabel}</p>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-gray-900">
                          {log.phoneE164}
                          {log.recipientLabel && log.recipientLabel !== '—' && (
                            <span className="ml-1 text-gray-400 font-sans">({log.recipientLabel})</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              log.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : log.status === 'SENT'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs font-mono text-gray-500">
                          {log.errorMessage ? (
                            <span className="text-red-600 font-sans">{log.errorMessage}</span>
                          ) : (
                            log.providerSid || 'N/A'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PLATFORM MRR & OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_OPTIONS.map((plan) => {
              const count = overview.planCounts?.[plan.code] || 0;
              const revenue = count * plan.price;
              return (
                <div key={plan.code} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${plan.badgeColor}`}>
                      {plan.name}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      Limit: {plan.maxEndpoints >= 99999 ? '∞' : plan.maxEndpoints} ep
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500 font-medium">workspaces</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Rate: ${plan.price}/mo</span>
                    <span className="font-bold text-emerald-600">+${revenue}/mo MRR</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              Global Messaging Performance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Delivered Successfully</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{overview.deliveredSms}</p>
                <p className="text-xs text-emerald-600 mt-1">Confirmed delivery across carriers</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
                <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">Failed Dispatches</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{overview.failedSms}</p>
                <p className="text-xs text-red-600 mt-1">Twilio or carrier rejections</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Overall Delivery Rate</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{overview.deliveryRate}%</p>
                <p className="text-xs text-blue-600 mt-1">Platform-wide average</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEEP MONITOR USER & WORKSPACE MODAL */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-white font-bold">
                  {inspectingUser.name ? inspectingUser.name.charAt(0).toUpperCase() : inspectingUser.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{inspectingUser.name || inspectingUser.email}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                      {inspectingUser.companyName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Email: <strong className="text-white">{inspectingUser.email}</strong> • Role: {inspectingUser.role}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {inspectingUser.companyId && (
                  <button
                    onClick={() => handleSwitchWorkspace(inspectingUser.companyId!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                    title="Operate as this user inside their dashboard"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Enter Workspace</span>
                  </button>
                )}
                <button
                  onClick={() => openUpgradeModal(inspectingUser)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/15 transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Change Plan</span>
                </button>
                <button
                  onClick={() => setInspectingUser(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick KPI bar for this user */}
            <div className="bg-indigo-50/70 border-b border-indigo-100 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-gray-500">Plan:</span>{' '}
                  <strong className="text-indigo-900 font-bold">{inspectingUser.subscription?.planName || 'Free Trial'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {inspectingUser.subscription?.status || 'ACTIVE'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Endpoints:</span>{' '}
                  <strong className="text-gray-900">{inspectingDetails?.endpoints.length ?? inspectingUser.activeEndpoints}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Recipients:</span>{' '}
                  <strong className="text-gray-900">{inspectingDetails?.recipients.length ?? inspectingUser.totalRecipients}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Alerts:</span>{' '}
                  <strong className="text-gray-900">{inspectingDetails?.notifications.length ?? inspectingUser.totalNotifications}</strong>
                </div>
              </div>
            </div>

            {/* Inner Subtabs */}
            <div className="px-6 border-b border-gray-200 flex gap-4 pt-2 bg-gray-50">
              <button
                onClick={() => setMonitorSubTab('endpoints')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                  monitorSubTab === 'endpoints'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Inbound Email Endpoints ({inspectingDetails?.endpoints.length ?? '...'})
              </button>
              <button
                onClick={() => setMonitorSubTab('emails')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                  monitorSubTab === 'emails'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Inbound Alerts Received ({inspectingDetails?.notifications.length ?? '...'})
              </button>
              <button
                onClick={() => setMonitorSubTab('recipients')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                  monitorSubTab === 'recipients'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Phone Recipients ({inspectingDetails?.recipients.length ?? '...'})
              </button>
              <button
                onClick={() => setMonitorSubTab('sms')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                  monitorSubTab === 'sms'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Recent SMS Dispatches ({inspectingDetails?.smsMessages.length ?? '...'})
              </button>
            </div>

            {/* Subtab Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading workspace activity data...
                </div>
              ) : (
                <>
                  {/* SUBTAB: ENDPOINTS */}
                  {monitorSubTab === 'endpoints' && (
                    <div className="space-y-3">
                      {(!inspectingDetails?.endpoints || inspectingDetails.endpoints.length === 0) ? (
                        <p className="text-center py-8 text-gray-400 text-xs">
                          This user has not created any inbound email endpoints yet.
                        </p>
                      ) : (
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                              <tr>
                                <th className="py-2.5 px-4">Endpoint Email</th>
                                <th className="py-2.5 px-4">Site / Customer</th>
                                <th className="py-2.5 px-4">Status</th>
                                <th className="py-2.5 px-4 text-right">Created</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {inspectingDetails.endpoints.map((ep: any) => (
                                <tr key={ep.id} className="hover:bg-gray-50/50">
                                  <td className="py-3 px-4 font-mono font-bold text-gray-900">
                                    {ep.fullEmailAddress}
                                  </td>
                                  <td className="py-3 px-4 text-gray-600">
                                    {ep.site?.name || '—'} {ep.customer?.name ? `(${ep.customer.name})` : ''}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        ep.status === 'ACTIVE'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {ep.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right text-gray-400">
                                    {new Date(ep.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB: INBOUND EMAILS */}
                  {monitorSubTab === 'emails' && (
                    <div className="space-y-3">
                      {(!inspectingDetails?.notifications || inspectingDetails.notifications.length === 0) ? (
                        <p className="text-center py-8 text-gray-400 text-xs">
                          No inbound email alerts received by this user yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {inspectingDetails.notifications.map((n: any) => (
                            <div key={n.id} className="p-3 rounded-xl border border-gray-200 bg-gray-50/40 text-xs space-y-1">
                              <div className="flex items-center justify-between text-gray-500 text-[11px]">
                                <span className="font-semibold text-gray-800">{new Date(n.receivedAt).toLocaleString()}</span>
                                <span className="font-mono">{n.from}</span>
                              </div>
                              <p className="font-bold text-gray-900">{n.subject || '(No Subject)'}</p>
                              {n.bodyText && (
                                <p className="text-gray-600 text-[11px] line-clamp-2 bg-white p-2 rounded-lg border border-gray-100 font-mono">
                                  {n.bodyText}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB: RECIPIENTS */}
                  {monitorSubTab === 'recipients' && (
                    <div className="space-y-3">
                      {(!inspectingDetails?.recipients || inspectingDetails.recipients.length === 0) ? (
                        <p className="text-center py-8 text-gray-400 text-xs">
                          No phone recipients configured yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {inspectingDetails.recipients.map((r: any) => (
                            <div key={r.id} className="p-3 rounded-xl border border-gray-200 bg-white text-xs flex items-center justify-between">
                              <div>
                                <p className="font-bold text-gray-900">{r.label || 'Contact'}</p>
                                <p className="font-mono text-indigo-600 font-semibold">{r.phoneE164}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                                Active
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB: SMS DISPATCHES */}
                  {monitorSubTab === 'sms' && (
                    <div className="space-y-3">
                      {(!inspectingDetails?.smsMessages || inspectingDetails.smsMessages.length === 0) ? (
                        <p className="text-center py-8 text-gray-400 text-xs">
                          No SMS messages dispatched yet.
                        </p>
                      ) : (
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                              <tr>
                                <th className="py-2.5 px-4">Timestamp</th>
                                <th className="py-2.5 px-4">Recipient</th>
                                <th className="py-2.5 px-4">Status</th>
                                <th className="py-2.5 px-4">Provider SID</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {inspectingDetails.smsMessages.map((sms: any) => (
                                <tr key={sms.id} className="hover:bg-gray-50/50">
                                  <td className="py-3 px-4 text-gray-500">
                                    {new Date(sms.createdAt).toLocaleTimeString()}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-gray-900">
                                    {sms.recipient?.phoneE164 || '—'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        sms.status === 'DELIVERED'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-blue-50 text-blue-700'
                                      }`}
                                    >
                                      {sms.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                                    {sms.providerSid || 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE PLAN / UPGRADE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-lg">Manage & Upgrade Plan</h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Instant subscription and endpoint quota override
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Workspace Info */}
            <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-950">{selectedUser.companyName}</p>
                <p className="text-[11px] text-indigo-700">
                  User: {selectedUser.name} ({selectedUser.email})
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-200/60 text-indigo-900">
                Current: {selectedUser.subscription?.planName || 'Starter Plan'}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleUpgradeSubmit} className="p-6 space-y-4">
              {/* Select Target Plan */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Target Plan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PLAN_OPTIONS.map((plan) => {
                    const isSelected = modalPlanCode === plan.code;
                    return (
                      <button
                        type="button"
                        key={plan.code}
                        onClick={() => setModalPlanCode(plan.code)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900">{plan.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          ${plan.price}/mo • {plan.maxEndpoints >= 99999 ? 'Unlimited' : `${plan.maxEndpoints} endpoints`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Select Subscription Status */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Subscription Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.value} — {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extension Duration */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Period End / Expiry Extension
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { days: 0, label: 'Keep Expiry' },
                    { days: 30, label: '+30 Days' },
                    { days: 90, label: '+90 Days' },
                    { days: 365, label: '+1 Year' },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.days}
                      onClick={() => {
                        setModalPeriodDays(opt.days);
                        setModalCustomDate('');
                      }}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg border transition ${
                        modalPeriodDays === opt.days && !modalCustomDate
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Or specific date:</span>
                  <input
                    type="date"
                    value={modalCustomDate}
                    onChange={(e) => {
                      setModalCustomDate(e.target.value);
                      setModalPeriodDays(0);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Admin Audit Note / Reason
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Paid via invoice / customer support resolution / upgraded to pro"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Applying this change immediately updates the database. The user will instantly receive the endpoint allowance upon refreshing their dashboard.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  disabled={modalSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Applying Upgrade...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Apply Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
