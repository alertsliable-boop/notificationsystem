import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { Bell, CheckCircle2, XCircle, Clock, ArrowRight, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Notifications | Liable Alerts' };

function SmsStatusPill({ status }: { status: string }) {
  if (status === 'DELIVERED') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
      <CheckCircle2 className="w-3 h-3" /> Delivered
    </span>
  );
  if (['FAILED', 'UNDELIVERED'].includes(status)) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
      <XCircle className="w-3 h-3" /> Failed
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; endpointId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*')
    .eq('userId', session.user.id)
    .single();
  if (!membership) return null;

  const page = parseInt(resolvedSearchParams?.page || '1');
  const pageSize = 25;
  const companyId = membership.companyId;

  let query = supabase
    .from('Notification')
    .select('*, endpoint:InboundEndpoint(label, localPart, domain:Domain(hostname)), smsMessages:SmsMessage(id, status)', { count: 'exact' })
    .eq('companyId', companyId)
    .order('receivedAt', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (resolvedSearchParams?.endpointId) {
    query = query.eq('endpointId', resolvedSearchParams.endpointId);
  }

  const [
    { data: notificationsData, count: totalCount },
    { data: endpointsData }
  ] = await Promise.all([
    query,
    supabase
      .from('InboundEndpoint')
      .select('id, label, localPart')
      .eq('companyId', companyId)
      .limit(50),
  ]);

  const notifications = notificationsData || [];
  const total = totalCount || 0;
  const endpoints = endpointsData || [];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Notifications & SMS Logs</h1>
          <p className="text-gray-500 text-[14px] mt-1">Full history of inbound alerts and their SMS delivery</p>
        </div>
        <div className="text-[13px] font-semibold text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-xl">
          {total.toLocaleString()} total
        </div>
      </div>

      {/* Filters */}
      {endpoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Filter by endpoint:</span>
            <Link
              href="/notifications"
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                !resolvedSearchParams?.endpointId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </Link>
            {endpoints.map((ep) => (
              <Link
                key={ep.id}
                href={`/notifications?endpointId=${ep.id}`}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  resolvedSearchParams?.endpointId === ep.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ep.label || ep.localPart}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
              <Bell className="w-7 h-7 text-gray-200" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-gray-700">No notifications yet</p>
              <p className="text-[13px] text-gray-400 mt-1">Notifications appear here when your endpoints receive emails</p>
            </div>
            <Link href="/endpoints/new" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              Create an endpoint first
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider w-36">Received</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Endpoint</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Message Preview</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">SMS</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notifications.map((notif) => {
                    const allDelivered = notif.smsMessages.length > 0 && notif.smsMessages.every((m: any) => m.status === 'DELIVERED');
                    const anyFailed = notif.smsMessages.some((m: any) => ['FAILED', 'UNDELIVERED'].includes(m.status));
                    const overallStatus = anyFailed ? 'FAILED' : allDelivered ? 'DELIVERED' : 'PENDING';
                    const dotColor = anyFailed ? 'bg-red-500' : allDelivered ? 'bg-green-500' : 'bg-blue-400 animate-pulse';
                    const endpointAddress = `${notif.endpoint.localPart}@${notif.endpoint.domain?.hostname || 'mail.liablealerts.com'}`;

                    return (
                      <tr key={notif.id} className="hover:bg-gray-50 transition-colors align-middle">
                        <td className="px-6 py-4 text-[12px] text-gray-400 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                            {new Date(notif.receivedAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[13px] font-semibold text-gray-900">
                            {notif.endpoint.label || notif.endpoint.localPart}
                          </p>
                          <p className="text-[11px] font-mono text-gray-400 truncate max-w-[160px]">{endpointAddress}</p>
                        </td>
                        <td className="px-6 py-4 max-w-[180px]">
                          <p className="text-[13px] font-medium text-gray-800 truncate">
                            {notif.subject || '(No Subject)'}
                          </p>
                        </td>
                        <td className="px-6 py-4 max-w-[200px]">
                          <p className="text-[12px] text-gray-400 truncate">
                            {notif.normalizedMessage || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <SmsStatusPill status={overallStatus} />
                            <span className="text-[11px] text-gray-400">{notif.smsMessages.length}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/notifications/${notif.id}`}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                          >
                            View <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-[13px] text-gray-500">{total.toLocaleString()} notifications total</p>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/notifications?page=${page - 1}${resolvedSearchParams?.endpointId ? `&endpointId=${resolvedSearchParams.endpointId}` : ''}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-white transition-colors"
                    >
                      ← Prev
                    </Link>
                  )}
                  <span className="text-[13px] text-gray-500 px-2">
                    {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/notifications?page=${page + 1}${resolvedSearchParams?.endpointId ? `&endpointId=${resolvedSearchParams.endpointId}` : ''}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-white transition-colors"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
