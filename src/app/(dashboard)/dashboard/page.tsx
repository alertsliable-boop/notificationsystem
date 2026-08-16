import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import {
  Mail, TrendingUp, Activity, AlertCircle, CheckCircle2,
  Clock, ArrowRight, Bell, Zap, Users, MapPin, Phone,
  BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Dashboard | Liable Alerts' };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*, company:Company(*)')
    .eq('userId', session.user.id)
    .single();
  if (!membership) return <div>No company found.</div>;

  const companyId = membership.companyId;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfTodayIso = startOfToday.toISOString();
  const startOfMonthIso = startOfMonth.toISOString();

  // We have to execute these queries via Supabase
  const [
    { count: activeEndpoints },
    { count: totalEndpoints },
    { data: subscription },
    { data: recentNotificationsData },
    { data: smsStatsData },
    { count: totalNotifications },
    { count: notificationsToday },
    { count: notificationsThisMonth },
    { count: recipientsCount },
    { count: customersCount },
  ] = await Promise.all([
    supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'ACTIVE'),
    supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
    supabase.from('CompanySubscription').select('*, plan:SubscriptionPlan(*)').eq('companyId', companyId).single(),
    supabase
      .from('Notification')
      .select('*, endpoint:InboundEndpoint(label, localPart, domain:Domain(hostname)), smsMessages:SmsMessage(status)')
      .eq('companyId', companyId)
      .order('receivedAt', { ascending: false })
      .limit(7),
    supabase.from('SmsMessage').select('status, notification!inner(companyId)').eq('notification.companyId', companyId),
    supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
    supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('companyId', companyId).gte('receivedAt', startOfTodayIso),
    supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('companyId', companyId).gte('receivedAt', startOfMonthIso),
    supabase.from('PhoneRecipient').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
    supabase.from('Customer').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
  ]);

  const recentNotifications = recentNotificationsData || [];
  
  // Group by in memory
  const smsStatsObj = (smsStatsData || []).reduce((acc: any, curr: any) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  const smsStats = Object.keys(smsStatsObj).map(status => ({ status, _count: { _all: smsStatsObj[status] } }));

  const maxEndpoints = subscription?.plan?.maxActiveEndpoints ?? 0;
  const delivered = smsStatsObj['DELIVERED'] ?? 0;
  const failed = (smsStatsObj['FAILED'] || 0) + (smsStatsObj['UNDELIVERED'] || 0);
  const totalSms = Object.values(smsStatsObj).reduce((sum: any, val: any) => sum + val, 0) as number;
  const deliveryRate = totalSms > 0 ? Math.round((delivered / totalSms) * 100) : 100;
  const usagePct = maxEndpoints > 0 ? Math.round(((activeEndpoints || 0) / maxEndpoints) * 100) : 0;

  const stats = [
    {
      label: 'Active Endpoints',
      value: `${activeEndpoints}/${maxEndpoints}`,
      sub: `${usagePct}% of plan used`,
      icon: Mail,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: usagePct >= 90 ? 'warn' : 'up',
      href: '/endpoints',
    },
    {
      label: 'Total Notifications',
      value: (totalNotifications || 0).toLocaleString(),
      sub: `${notificationsToday} today • ${notificationsThisMonth} this month`,
      icon: Bell,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: 'up',
      href: '/notifications',
    },
    {
      label: 'SMS Delivered',
      value: delivered.toLocaleString(),
      sub: `${deliveryRate}% delivery rate`,
      icon: CheckCircle2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: deliveryRate >= 95 ? 'up' : 'down',
      href: '/notifications',
    },
    {
      label: 'Failed / Undelivered',
      value: failed.toLocaleString(),
      sub: failed === 0 ? 'All clear!' : 'Check SMS logs',
      icon: AlertCircle,
      iconBg: failed > 0 ? 'bg-red-50' : 'bg-gray-50',
      iconColor: failed > 0 ? 'text-red-600' : 'text-gray-400',
      trend: failed === 0 ? 'up' : 'down',
      href: '/notifications',
    },
  ];

  const quickStats = [
    { label: 'Recipients', value: recipientsCount, icon: Phone, href: '/recipients', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Customers', value: customersCount, icon: Users, href: '/customers', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'All Endpoints', value: totalEndpoints, icon: Activity, href: '/endpoints', color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight tracking-tight">
            Welcome back, {session.user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-[14px]">
            Here&apos;s what&apos;s happening with your alert platform.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[12px] text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Limit Reached Banner */}
      {usagePct >= 100 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-slideUp">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-red-900">Endpoint limit reached</p>
            <p className="text-[12px] text-red-700">You&apos;ve used all {maxEndpoints} allowed endpoints. Upgrade your plan to create more.</p>
          </div>
          <Link href="/billing" className="text-[13px] font-semibold text-red-700 hover:text-red-900 whitespace-nowrap">
            Upgrade →
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`stat-card group animate-fadeIn delay-${i * 75}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              {stat.trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : stat.trend === 'warn' ? (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">{stat.value}</p>
            <p className="text-[12px] text-gray-400 mt-2">{stat.sub}</p>

            {/* Usage Bar for endpoints */}
            {stat.label === 'Active Endpoints' && maxEndpoints > 0 && (
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Main Content: Recent Notifications + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notifications — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Recent Notifications</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">Latest alerts processed through your endpoints</p>
            </div>
            <Link
              href="/notifications"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                <Mail className="w-7 h-7 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-gray-700">No notifications yet</p>
                <p className="text-[12px] text-gray-400 mt-1">Notifications appear when your endpoints receive emails</p>
              </div>
              <Link
                href="/endpoints/new"
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Create your first endpoint <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentNotifications.map((notif: any) => {
                const allDelivered = notif.smsMessages.length > 0 && notif.smsMessages.every((m: any) => m.status === 'DELIVERED');
                const anyFailed = notif.smsMessages.some((m: any) => ['FAILED', 'UNDELIVERED'].includes(m.status));
                const isPending = notif.smsMessages.some((m: any) => ['QUEUED', 'SENDING'].includes(m.status));

                const statusDot = anyFailed
                  ? 'bg-red-500'
                  : allDelivered
                  ? 'bg-green-500'
                  : isPending
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-gray-300';

                const statusLabel = anyFailed
                  ? 'Failed'
                  : allDelivered
                  ? 'Delivered'
                  : isPending
                  ? 'Sending…'
                  : 'Pending';

                const statusColor = anyFailed
                  ? 'text-red-600 bg-red-50'
                  : allDelivered
                  ? 'text-green-700 bg-green-50'
                  : isPending
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 bg-gray-50';

                return (
                  <Link
                    key={notif.id}
                    href={`/notifications/${notif.id}`}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {notif.endpoint.label || notif.endpoint.localPart}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 truncate mt-0.5">
                        {notif.subject || '(No Subject)'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-gray-400">
                        {new Date(notif.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {notif.smsMessages.length} SMS
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Current Plan Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-white" fill="currentColor" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
                {subscription?.status || 'Active'}
              </span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200 mb-1">Current Plan</p>
            <h3 className="text-[22px] font-bold leading-tight mb-0.5">{subscription?.plan?.name || 'Free Plan'}</h3>
            <p className="text-[13px] text-blue-200">{maxEndpoints} Email Endpoints</p>

            {/* Mini usage bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-blue-200 mb-1.5">
                <span>Usage</span>
                <span>{activeEndpoints}/{maxEndpoints}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
            </div>

            <Link
              href="/billing"
              className="mt-4 block text-center bg-white text-blue-700 font-bold text-[13px] py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Manage Subscription
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[13px] font-bold text-gray-900 mb-4">Quick Overview</h3>
            <div className="space-y-2.5">
              {quickStats.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-gray-700">{s.label}</span>
                  <span className="text-[15px] font-bold text-gray-900">{s.value}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Alert Flow
            </h3>
            <div className="space-y-3">
              {[
                { step: '1', label: 'Equipment sends email', color: 'bg-blue-100 text-blue-700' },
                { step: '2', label: 'Platform receives & routes', color: 'bg-purple-100 text-purple-700' },
                { step: '3', label: 'SMS sent to recipients', color: 'bg-green-100 text-green-700' },
                { step: '4', label: 'Delivery logged', color: 'bg-orange-100 text-orange-700' },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${item.color}`}>
                    {item.step}
                  </span>
                  <span className="text-[12px] text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
