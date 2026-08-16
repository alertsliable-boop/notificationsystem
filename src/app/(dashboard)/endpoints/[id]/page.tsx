import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Mail, MapPin, Users, Activity,
  Bell, Phone, Calendar, Clock, FileText, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { EndpointActions } from './EndpointActions';

export const metadata = { title: 'Endpoint Details & Logs | Liable Alerts' };

export default async function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*')
    .eq('userId', session.user.id)
    .single();
  if (!membership) return null;

  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select(`
      *,
      domain:Domain(*),
      customer:Customer(*),
      site:Site(*),
      recipients:EndpointRecipient(id, recipient:PhoneRecipient(*))
    `)
    .eq('id', id)
    .eq('companyId', membership.companyId)
    .single();

  if (!endpoint) notFound();
  
  const { count } = await supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('endpointId', endpoint.id);
  endpoint._count = { notifications: count || 0 };
  
  const recipientsList = endpoint.recipients || [];

  const { data: recentNotificationsData } = await supabase
    .from('Notification')
    .select('*, smsMessages:SmsMessage(status, providerSid, errorCode)')
    .eq('endpointId', endpoint.id)
    .order('receivedAt', { ascending: false })
    .limit(15);
    
  const recentNotifications = recentNotificationsData || [];

  const emailAddress = `${endpoint.localPart}@${endpoint.domain?.hostname || 'mail.liablealerts.com'}`;
  const isActive = endpoint.status === 'ACTIVE';

  return (
    <div className="max-w-5xl space-y-6 animate-fadeIn py-6">
      {/* Back Navigation */}
      <Link
        href="/endpoints"
        className="inline-flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-800 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Endpoints
      </Link>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-[22px] font-bold text-gray-900">
                  {endpoint.label || endpoint.localPart}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isActive
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {isActive ? 'Active Endpoint' : 'Inactive Endpoint'}
                </span>
              </div>
              <code className="text-[13px] text-blue-600 font-mono bg-blue-50 px-3 py-1 rounded-lg inline-block font-semibold">
                {emailAddress}
              </code>
            </div>
          </div>

          <EndpointActions
            endpointId={endpoint.id}
            status={endpoint.status}
            emailAddress={emailAddress}
            recipients={recipientsList}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Notification History & Delivery Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide">Total Inbound Alerts</p>
                  <p className="text-[22px] font-bold text-gray-900">{endpoint._count.notifications}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide">Configured Recipients</p>
                  <p className="text-[22px] font-bold text-gray-900">{recipientsList.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notification History & Delivery Logs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Notification History & Delivery Logs ({recentNotifications.length})
              </h2>
            </div>

            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-center px-4">
                <Bell className="w-8 h-8 text-gray-200" />
                <p className="text-[13px] font-semibold text-gray-700">No notifications received yet</p>
                <p className="text-[12px] text-gray-400 max-w-sm">
                  Send an email to <code className="text-blue-600 font-mono">{emailAddress}</code> from your equipment to test message parsing and SMS forwarding.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentNotifications.map((notif: any) => {
                  const smsCount = notif.smsMessages?.length || 0;
                  const allDelivered = smsCount > 0 && notif.smsMessages.every((m: any) => m.status === 'DELIVERED');
                  const anyFailed = notif.smsMessages.some((m: any) => ['FAILED', 'UNDELIVERED'].includes(m.status));
                  const statusColor = anyFailed ? 'bg-red-500' : allDelivered ? 'bg-green-500' : 'bg-blue-500';

                  return (
                    <Link
                      key={notif.id}
                      href={`/notifications/${notif.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors group"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {notif.subject || '(No Subject)'}
                        </p>
                        <p className="text-[12px] text-gray-500 truncate mt-0.5 font-mono">
                          {notif.normalizedMessage || 'No content preview'}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-purple-500" />
                            {smsCount} SMS Recipient(s)
                          </span>
                          {anyFailed && (
                            <span className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Delivery Failed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-shrink-0 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(notif.receivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Info Panel */}
        <div className="space-y-5">
          {/* Customer & Site Assignment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[13px] font-bold text-gray-900 mb-4">Location & Assignment</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Assigned Customer</p>
                  <p className="text-[13px] font-semibold text-gray-800 mt-0.5">
                    {endpoint.customer?.name || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Assigned Site</p>
                  <p className="text-[13px] font-semibold text-gray-800 mt-0.5">
                    {endpoint.site?.name || '—'}
                  </p>
                </div>
              </div>

              {endpoint.severityTag && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Severity Tag</p>
                    <p className="text-[13px] font-semibold text-orange-700 mt-0.5">{endpoint.severityTag}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[13px] font-bold text-gray-900 mb-3">Endpoint Configuration</h3>
            <div className="space-y-2.5 text-[12px]">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Inbound Address</span>
                <span className="font-mono text-blue-600 font-semibold">{endpoint.localPart}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Platform Domain</span>
                <span className="font-mono text-gray-800">{endpoint.domain?.hostname || 'mail.liablealerts.com'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Status</span>
                <span className={`font-semibold ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Created Date</span>
                <span className="text-gray-700">
                  {new Date(endpoint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {endpoint.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[13px] font-bold text-gray-900 mb-2">Notes</h3>
              <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">{endpoint.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
