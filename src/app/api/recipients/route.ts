import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

// GET /api/recipients
export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();
  const { data: recipients } = await supabase
    .from('PhoneRecipient')
    .select('*, endpoints:EndpointRecipient(id)')
    .eq('companyId', ctx.companyId)
    .order('label', { ascending: true });

  const mappedRecipients = (recipients || []).map((r: any) => ({
    ...r,
    _count: { endpoints: r.endpoints?.length || 0 }
  }));

  return NextResponse.json({ data: mappedRecipients });
}

// POST /api/recipients
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const { phoneE164, label } = await req.json();

    if (!phoneE164 || !/^\+[1-9]\d{1,14}$/.test(phoneE164)) {
      return NextResponse.json({ error: 'Invalid phone number. Use E.164 format (e.g. +15551234567).' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check for duplicate within company
    const { data: existing } = await supabase
      .from('PhoneRecipient')
      .select('*')
      .eq('companyId', ctx.companyId)
      .eq('phoneE164', phoneE164)
      .single();

    if (existing) {
      return NextResponse.json({ data: existing }); // Return existing silently
    }

    const { data: recipient } = await supabase
      .from('PhoneRecipient')
      .insert({ companyId: ctx.companyId, phoneE164, label })
      .select()
      .single();

    return NextResponse.json({ data: recipient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
