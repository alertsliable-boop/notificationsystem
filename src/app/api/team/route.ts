import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'ADMIN', 'BILLING']).default('MEMBER'),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, role } = schema.parse(body);

    const supabase = getAdminClient();
    let { data: user } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      // Mock creation of user for simplicity since email invites require more setup
      // In a real system, you might send an email invite or create a placeholder.
      const { data: newUser } = await supabase
        .from('User')
        .insert({
          email,
          name: email.split('@')[0], // placeholder name
          passwordHash: '', // Dummy passwordHash since Prisma required it
        })
        .select()
        .single();
      user = newUser;
    }

    const { data: existingMembership } = await supabase
      .from('Membership')
      .select('*')
      .eq('userId', user.id)
      .eq('companyId', ctx.companyId)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: 'User is already in this team' }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from('Membership')
      .insert({
        userId: user.id,
        companyId: ctx.companyId,
        role,
      })
      .select()
      .single();

    if (!membership) throw new Error('Failed to create membership');

    await auditLog(ctx, 'INVITE_TEAM_MEMBER', 'Membership', membership.id, { email, role });

    return NextResponse.json({ data: membership }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}
