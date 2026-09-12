import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { normalizePhoneE164 } from '@/lib/phone';

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const { sourceRecipientId, targetRecipientId, autoMergeAll } = body;
    const supabase = getAdminClient();

    if (autoMergeAll) {
      // Fetch all recipients for company
      const { data: recipients } = await supabase
        .from('PhoneRecipient')
        .select('*, endpoints:EndpointRecipient(id, endpointId)')
        .eq('companyId', ctx.companyId);

      if (!recipients || recipients.length === 0) {
        return NextResponse.json({ message: 'No recipients found' });
      }

      // Group by normalized phone
      const map = new Map<string, any[]>();
      for (const r of recipients) {
        const norm = normalizePhoneE164(r.phoneE164);
        const list = map.get(norm) || [];
        list.push(r);
        map.set(norm, list);
      }

      let mergedCount = 0;

      for (const [normPhone, group] of map.entries()) {
        if (group.length > 1) {
          // Find the primary: prefer the one already starting with +1 or having the right label
          const primary = group.find((r) => r.phoneE164 === normPhone) || group[0];
          const duplicates = group.filter((r) => r.id !== primary.id);

          // Update primary phone to normPhone if needed
          if (primary.phoneE164 !== normPhone) {
            await supabase
              .from('PhoneRecipient')
              .update({ phoneE164: normPhone })
              .eq('id', primary.id);
          }

          // Move all endpoint links from duplicates to primary
          for (const dup of duplicates) {
            const { data: links } = await supabase
              .from('EndpointRecipient')
              .select('*')
              .eq('recipientId', dup.id);

            for (const link of (links || [])) {
              // Check if primary is already linked to this endpoint
              const { data: existingLink } = await supabase
                .from('EndpointRecipient')
                .select('id')
                .eq('endpointId', link.endpointId)
                .eq('recipientId', primary.id)
                .single();

              if (!existingLink) {
                // Relink to primary
                await supabase
                  .from('EndpointRecipient')
                  .update({ recipientId: primary.id })
                  .eq('id', link.id);
              } else {
                // Delete duplicate link
                await supabase
                  .from('EndpointRecipient')
                  .delete()
                  .eq('id', link.id);
              }
            }

            // Delete duplicate recipient
            await supabase
              .from('PhoneRecipient')
              .delete()
              .eq('id', dup.id);

            mergedCount++;
          }
        } else if (group.length === 1 && group[0].phoneE164 !== normPhone) {
          // Single record but needs normalization (e.g. +3055825595 -> +13055825595)
          await supabase
            .from('PhoneRecipient')
            .update({ phoneE164: normPhone })
            .eq('id', group[0].id);
        }
      }

      await auditLog(ctx, 'AUTO_MERGE_RECIPIENTS', 'PhoneRecipient', ctx.companyId, { mergedCount });
      return NextResponse.json({ success: true, mergedCount });
    }

    if (!sourceRecipientId || !targetRecipientId) {
      return NextResponse.json({ error: 'sourceRecipientId and targetRecipientId are required' }, { status: 400 });
    }

    // Explicit merge
    const { data: links } = await supabase
      .from('EndpointRecipient')
      .select('*')
      .eq('recipientId', sourceRecipientId);

    for (const link of (links || [])) {
      const { data: existingLink } = await supabase
        .from('EndpointRecipient')
        .select('id')
        .eq('endpointId', link.endpointId)
        .eq('recipientId', targetRecipientId)
        .single();

      if (!existingLink) {
        await supabase
          .from('EndpointRecipient')
          .update({ recipientId: targetRecipientId })
          .eq('id', link.id);
      } else {
        await supabase
          .from('EndpointRecipient')
          .delete()
          .eq('id', link.id);
      }
    }

    // Delete source recipient
    await supabase
      .from('PhoneRecipient')
      .delete()
      .eq('id', sourceRecipientId);

    await auditLog(ctx, 'MERGE_RECIPIENTS', 'PhoneRecipient', targetRecipientId, { sourceRecipientId });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error merging recipients:', err);
    return NextResponse.json({ error: err.message || 'Failed to merge recipients' }, { status: 500 });
  }
}
