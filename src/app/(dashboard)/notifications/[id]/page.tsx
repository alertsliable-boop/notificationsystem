import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Mail, MapPin, Users, Clock,
  CheckCircle2, XCircle, AlertCircle, Phone, MessageSquare
} from 'lucide-react';

export const metadata = { title: 'Notification Detail | Liable Alerts' };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; Icon: any }> = {
    DELIVERED: { label: 'Delivered', className: 'bg-green-50 text-green-700 border-green-100', Icon: CheckCircle2 },
    SENT: { label: 'Sent', className: 'bg-blue-50 text-blue-700 border-blue-100', Icon: CheckCircle2 },
    FAILED: { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-100', Icon: XCircle },
    UNDELIVERED: { label: 'Undelivered', className: 'bg-red-50 text-red-700 border-red-100', Icon: XCircle },
    QUEUED: { label: 'Queued', className: 'bg-gray-50 text-gray-700 border-gray-200', Icon: Clock },
    SENDING: { label: 'Sending', className: 'bg-blue-50 text-blue-700 border-blue-100', Icon: Clock },
  };
  const cfg = map[status] || { label: status, className: 'bg-gray-50 text-gray-600 border-gray-200', Icon: AlertCircle };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-semibold ${cfg.className}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default async function NotificationDetailPage({
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

  const { data: notification } = await supabase
    .from('Notification')
    .select(`
      *,
      endpoint:InboundEndpoint(label, localPart, domain:Domain(hostname), customer:Customer(id, name), site:Site(id, name)),
      payload:Payload(*),
      smsMessages:SmsMessage(
        *,
        events:SmsDeliveryEvent(*)
      )
    `)
    .eq('id', id)
    .eq('companyId', membership.companyId)
    .single();

  if (!notification) notFound();
  
  if (notification.smsMessages) {
    notification.smsMessages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    notification.smsMessages.forEach((sms: any) => {
      if (sms.events) {
        sms.events.sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
      } else {
        sms.events = [];
      }
    });
  } else {
    notification.smsMessages = [];
  }

  const emailAddress = `${notification.endpoint.localPart}@${notification.endpoint.domain?.hostname || 'mail.liablealerts.com'}`;

  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn">
      {/* Back Navigation */}
      <Link
        href="/notifications"
        className="inline-flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-800 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notifications
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Notification</span>
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 leading-tight mb-1">
              {notification.subject || '(No Subject)'}
            </h1>
            <p className="text-[13px] text-gray-500">
              Received {new Date(notification.receivedAt).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex gap-2">
            {notification.smsMessages.length > 0 && (
              <StatusBadge status={
                notification.smsMessages.every((m: any) => m.status === 'DELIVERED') ? 'DELIVERED' :
                notification.smsMessages.some((m: any) => ['FAILED', 'UNDELIVERED'].includes(m.status)) ? 'FAILED' :
                notification.smsMessages.some((m: any) => ['QUEUED', 'SENDING'].includes(m.status)) ? 'SENDING' : 'SENT'
              } />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Email Content + SMS Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Normalized Message */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[14px] font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Alert Message
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">
              {notification.normalizedMessage || '(No message content)'}
            </div>
          </div>

          {/* Raw Text */}
          {notification.payload?.rawText && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-[14px] font-bold text-gray-900 mb-4">Full Email Body</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-mono">
                {notification.payload.rawText}
              </div>
            </div>
          )}

          {/* SMS Delivery Logs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                SMS Delivery Log ({notification.smsMessages.length})
              </h2>
            </div>
            {notification.smsMessages.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Phone className="w-8 h-8 text-gray-200" />
                <p className="text-[13px] text-gray-400">No SMS messages sent for this notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notification.smsMessages.map((sms: any, i: number) => (
                  <div key={sms.id} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[11px] font-bold text-gray-500">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900">Recipient #{i + 1}</p>
                          {sms.providerSid && (
                            <p className="text-[11px] font-mono text-gray-400">{sms.providerSid}</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={sms.status} />
                    </div>

                    {/* Delivery Timeline */}
                    {sms.events.length > 0 && (
                      <div className="ml-10 mt-3 space-y-2">
                        {sms.events.map((event: any) => (
                          <div key={event.id} className="flex items-center gap-3 text-[12px]">
                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
                            <StatusBadge status={event.status} />
                            <span className="text-gray-400">
                              {new Date(event.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {event.errorCode && (
                              <span className="text-red-500 font-mono">Error: {event.errorCode}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {sms.errorCode && (
                      <div className="ml-10 mt-2 text-[12px] text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Error code: {sms.errorCode}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Meta Info */}
        <div className="space-y-5">
          {/* Endpoint Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              Endpoint
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Label</p>
                <p className="text-[13px] font-semibold text-gray-900">
                  {notification.endpoint.label || notification.endpoint.localPart}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-[12px] font-mono text-blue-600 break-all">{emailAddress}</p>
              </div>
            </div>
          </div>

          {/* Customer & Site */}
          {(notification.endpoint.customer || notification.endpoint.site) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[13px] font-bold text-gray-900 mb-4">Location</h3>
              <div className="space-y-3">
                {notification.endpoint.customer && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Customer</p>
                      <p className="text-[13px] font-medium text-gray-800">
                        {notification.endpoint.customer.name}
                      </p>
                    </div>
                  </div>
                )}
                {notification.endpoint.site && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Site</p>
                      <p className="text-[13px] font-medium text-gray-800">
                        {notification.endpoint.site.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[13px] font-bold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[12px] text-gray-500">Total SMS</span>
                <span className="text-[12px] font-bold text-gray-900">{notification.smsMessages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-gray-500">Delivered</span>
                <span className="text-[12px] font-bold text-green-700">
                  {notification.smsMessages.filter((m: any) => m.status === 'DELIVERED').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-gray-500">Failed</span>
                <span className="text-[12px] font-bold text-red-700">
                  {notification.smsMessages.filter((m: any) => ['FAILED', 'UNDELIVERED'].includes(m.status)).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
