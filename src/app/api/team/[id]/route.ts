import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string  }> }
) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const { id  } = await params; // This is the membership id

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
