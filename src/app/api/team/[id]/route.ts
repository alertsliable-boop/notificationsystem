import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['MEMBER', 'ADMIN', 'BILLING']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    const supabase = getAdminClient();

    const { data: membership } = await supabase
      .from('Membership')
      .select('*, user:User(*)')
      .eq('id', id)
      .eq('companyId', ctx.companyId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    if (data.role && data.role !== membership.role) {
      if (membership.role === 'OWNER') {
        return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
      }
      await supabase.from('Membership').update({ role: data.role }).eq('id', id);
    }

    if (data.email || data.name) {
      const updatePayload: Record<string, any> = {};
      if (data.email) updatePayload.email = data.email.toLowerCase().trim();
      if (data.name) updatePayload.name = data.name.trim();

      await supabase.from('User').update(updatePayload).eq('id', membership.userId);
    }

    await auditLog(ctx, 'UPDATE_TEAM_MEMBER', 'Membership', id, { ...data });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const { id } = await params;

  const supabase = getAdminClient();
  const { data: membership } = await supabase
    .from('Membership')
    .select('*')
    .eq('id', id)
    .eq('companyId', ctx.companyId)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (membership.role === 'OWNER') {
    return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 });
  }
  
  if (membership.userId === ctx.userId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }

  await supabase.from('Membership').delete().eq('id', id);

  await auditLog(ctx, 'REMOVE_TEAM_MEMBER', 'Membership', id, { userId: membership.userId });

  return NextResponse.json({ success: true });
}
