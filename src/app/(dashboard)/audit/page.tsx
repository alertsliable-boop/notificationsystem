import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { ClipboardList, Clock, Activity } from 'lucide-react';

export const metadata = { title: 'Audit Logs | Liable Alerts' };

function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    endpoint_created: 'bg-green-50 text-green-700',
    endpoint_deactivated: 'bg-yellow-50 text-yellow-700',
    endpoint_activated: 'bg-blue-50 text-blue-700',
    endpoint_deleted: 'bg-red-50 text-red-700',
    customer_created: 'bg-purple-50 text-purple-700',
    site_created: 'bg-indigo-50 text-indigo-700',
    sms_sent: 'bg-teal-50 text-teal-700',
    plan_changed: 'bg-orange-50 text-orange-700',
  };
  const cls = colorMap[action] || 'bg-gray-50 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
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
  const pageSize = 50;
  const companyId = membership.companyId;

  const [
    { data: logsData, count: totalCount }
  ] = await Promise.all([
    supabase
      .from('AuditLog')
      .select('*', { count: 'exact' })
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1),
  ]);

  const logs = logsData || [];
  const total = totalCount || 0;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Audit Logs</h1>
        <p className="text-gray-500 text-[14px] mt-1">Track all actions taken in your account</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide">Total Events</p>
              <p className="text-[22px] font-bold text-gray-900">{total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide">This Page</p>
              <p className="text-[22px] font-bold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">Event Log</h2>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-gray-700">No audit events yet</p>
              <p className="text-[12px] text-gray-400 mt-1">Account actions will be logged here</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Entity Type</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Entity ID</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                          <span className="text-[12px] text-gray-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[12px] text-gray-600 font-medium">{log.entityType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-[11px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">
                          {log.entityId.slice(0, 12)}…
                        </code>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        {log.metadata ? (
                          <code className="text-[11px] text-gray-400 truncate block">
                            {JSON.stringify(log.metadata).slice(0, 60)}
                          </code>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-[13px] text-gray-500">{total.toLocaleString()} total events</p>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <a
                      href={`?page=${page - 1}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-white transition-colors"
                    >
                      ← Prev
                    </a>
                  )}
                  <span className="text-[13px] text-gray-500 px-2">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <a
                      href={`?page=${page + 1}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-white transition-colors"
                    >
                      Next →
                    </a>
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
