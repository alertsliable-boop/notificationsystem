import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

import { normalizePhoneE164, isValidPhoneE164 } from '@/lib/phone';

const schema = z.object({
  recipientId: z.string().optional(),
  phoneE164: z.string().optional(),
  label: z.string().optional(),
});

// POST /api/endpoints/[id]/recipients — Add recipient to endpoint
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: endpointId } = await params;

  try {
    const body = await req.json();
    const { recipientId, phoneE164: rawPhone, label } = schema.parse(body);

    const supabase = getAdminClient();

    // Verify endpoint ownership
    const { data: endpoint } = await supabase
      .from('InboundEndpoint')
      .select('*')
      .eq('id', endpointId)
      .eq('companyId', ctx.companyId)
      .single();

    if (!endpoint) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

    let recipient: any = null;

    if (recipientId) {
      // Find existing recipient
      const { data: existingRec } = await supabase
        .from('PhoneRecipient')
        .select('*')
        .eq('id', recipientId)
        .eq('companyId', ctx.companyId)
        .single();
      recipient = existingRec;
    } else if (rawPhone) {
      const normalized = normalizePhoneE164(rawPhone);
      if (!isValidPhoneE164(normalized)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
      }

      // Find or create phone recipient
      let { data: existing } = await supabase
        .from('PhoneRecipient')
        .select('*')
        .eq('companyId', ctx.companyId)
        .eq('phoneE164', normalized)
        .single();

      if (!existing) {
        const { data: newRec } = await supabase
          .from('PhoneRecipient')
          .insert({
            companyId: ctx.companyId,
            phoneE164: normalized,
            label: label || normalized,
          })
          .select()
          .single();
        recipient = newRec;
      } else {
        recipient = existing;
      }
    }

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient could not be found or created' }, { status: 400 });
    }

    // Link recipient to endpoint
    const { data: link } = await supabase
      .from('EndpointRecipient')
      .select('*')
      .eq('endpointId', endpointId)
      .eq('recipientId', recipient.id)
      .single();

    if (!link) {
      // Get the company subscription to check plan limits
      const { data: subscription } = await supabase
        .from('CompanySubscription')
        .select('plan:SubscriptionPlan(*)')
        .eq('companyId', ctx.companyId)
        .single();
        
      const maxRecipients = subscription?.plan?.code === 'free_trial' ? 2 : 10;

      // Enforce recipient limit
      const { count } = await supabase
        .from('EndpointRecipient')
        .select('*', { count: 'exact', head: true })
        .eq('endpointId', endpointId);
        
      if (count !== null && count >= maxRecipients) {
        return NextResponse.json({ error: `Maximum of ${maxRecipients} recipients allowed per endpoint on your current plan. Please upgrade or remove existing recipients.` }, { status: 403 });
      }

      await supabase
        .from('EndpointRecipient')
        .insert({
          endpointId,
          recipientId: recipient.id,
        });
    }

    await auditLog(ctx, 'ADD_ENDPOINT_RECIPIENT', 'EndpointRecipient', endpointId, { recipientId: recipient.id, phoneE164: recipient.phoneE164 });

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
