import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const schema = z.object({
  phoneE164: z.string().min(8),
  label: z.string().optional(),
});

// POST /api/endpoints/[id]/recipients — Add recipient to endpoint
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: endpointId } = await params;

  try {
    const body = await req.json();
    let { phoneE164, label } = schema.parse(body);

    if (!phoneE164.startsWith('+')) phoneE164 = `+${phoneE164}`;

    const supabase = getAdminClient();

    // Verify endpoint ownership
    const { data: endpoint } = await supabase
      .from('InboundEndpoint')
      .select('*')
      .eq('id', endpointId)
      .eq('companyId', ctx.companyId)
      .single();

    if (!endpoint) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

    // Find or create phone recipient
    let { data: recipient } = await supabase
      .from('PhoneRecipient')
      .select('*')
      .eq('companyId', ctx.companyId)
      .eq('phoneE164', phoneE164)
      .single();

    if (!recipient) {
      const { data: newRec } = await supabase
        .from('PhoneRecipient')
        .insert({
          companyId: ctx.companyId,
          phoneE164,
          label: label || phoneE164,
        })
        .select()
        .single();
      recipient = newRec;
    }

    if (!recipient) throw new Error('Failed to create recipient');

    // Link recipient to endpoint
    const { data: link } = await supabase
      .from('EndpointRecipient')
      .select('*')
      .eq('endpointId', endpointId)
      .eq('recipientId', recipient.id)
      .single();

    if (!link) {
      await supabase
        .from('EndpointRecipient')
        .insert({
          endpointId,
          recipientId: recipient.id,
        });
    }

    await auditLog(ctx, 'ADD_ENDPOINT_RECIPIENT', 'EndpointRecipient', endpointId, { phoneE164 });

    return NextResponse.json({ success: true, recipient });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add recipient' }, { status: 400 });
  }
}

// DELETE /api/endpoints/[id]/recipients — Remove recipient link from endpoint
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: endpointId } = await params;
  const { searchParams } = new URL(req.url, 'http://localhost');
  const recipientId = searchParams.get('recipientId');

  if (!recipientId) return NextResponse.json({ error: 'Recipient ID required' }, { status: 400 });

  const supabase = getAdminClient();

  // Verify ownership
  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select('*')
    .eq('id', endpointId)
    .eq('companyId', ctx.companyId)
    .single();

  if (!endpoint) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

  await supabase
    .from('EndpointRecipient')
    .delete()
    .eq('endpointId', endpointId)
    .eq('recipientId', recipientId);

  await auditLog(ctx, 'REMOVE_ENDPOINT_RECIPIENT', 'EndpointRecipient', endpointId, { recipientId });

  return NextResponse.json({ success: true });
}
