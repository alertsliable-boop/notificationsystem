import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';
import { createEndpoint, PlanLimitExceededError } from '@/services/endpointService';

export const dynamic = 'force-dynamic';

// GET all endpoints for company
export async function GET(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const status = searchParams.get('status') as 'ACTIVE' | 'INACTIVE' | null;
  const customerId = searchParams.get('customerId');
  const siteId = searchParams.get('siteId');

  const supabase = getAdminClient();
  let query = supabase
    .from('InboundEndpoint')
    .select('*, customer:Customer(name), site:Site(name), domain:Domain(hostname), recipients:EndpointRecipient(recipient:PhoneRecipient(id, phoneE164, label))')
    .eq('companyId', ctx.companyId)
    .order('createdAt', { ascending: false });

  if (status) query = query.eq('status', status);
  if (customerId) query = query.eq('customerId', customerId);
  if (siteId) query = query.eq('siteId', siteId);

  const { data: endpoints, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get notification counts for endpoints
  const endpointsWithCount = await Promise.all(
    (endpoints || []).map(async (ep) => {
      const { count } = await supabase
        .from('Notification')
        .select('*', { count: 'exact', head: true })
        .eq('endpointId', ep.id);
      return {
        ...ep,
        _count: {
          recipients: ep.recipients?.length || 0,
          notifications: count || 0,
        },
      };
    })
  );

  return NextResponse.json({ data: endpointsWithCount });
}

// POST create new endpoint
const createEndpointSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  localPart: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  siteId: z.string().min(1, 'Site is required'),
  severityTag: z.string().optional(),
  notes: z.string().optional(),
  recipients: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const validated = createEndpointSchema.parse(body);

    const endpoint = await createEndpoint({
      companyId: ctx.companyId,
      label: validated.label,
      localPartInput: validated.localPart,
      customerId: validated.customerId,
      siteId: validated.siteId,
      recipients: validated.recipients || [],
      notes: validated.notes,
      severityTag: validated.severityTag,
    });

    await auditLog(ctx, 'CREATE_ENDPOINT', 'InboundEndpoint', endpoint.id, {
      label: endpoint.label,
      localPart: endpoint.localPart,
    });

    return NextResponse.json({ data: endpoint });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as any).errors || (error as any).issues },
        { status: 400 }
      );
    }

    if (error instanceof PlanLimitExceededError) {
      return NextResponse.json(
        { error: error.message, code: 'PLAN_LIMIT_EXCEEDED' },
        { status: 403 }
      );
    }

    console.error('Error creating endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create email endpoint' },
      { status: 400 }
    );
  }
}
