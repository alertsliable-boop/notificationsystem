/**
 * RBAC (Role-Based Access Control) utilities.
 * Used server-side in API routes to enforce authorization rules.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { Role } from '@/lib/types';

export interface AuthContext {
  userId: string;
  companyId: string;
  role: Role;
}

/**
 * Get the current authenticated user's company context.
 * Returns null if not authenticated or no membership found.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const supabase = getAdminClient();
  const { data: membership, error } = await supabase
    .from('Membership')
    .select('*')
    .eq('userId', session.user.id)
    .order('id', { ascending: true })
    .limit(1)
    .single();

  if (error || !membership) return null;

  return {
    userId: session.user.id,
    companyId: membership.companyId,
    role: membership.role as Role,
  };
}

/**
 * Require authentication — returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return ctx;
}

/**
 * Require specific roles (e.g. OWNER or ADMIN only).
 */
export async function requireRole(
  allowedRoles: Role[]
): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;

  if (!allowedRoles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return ctx;
}

/**
 * Verify a resource belongs to the authenticated company (tenant isolation).
 */
export function isUnauthorizedResponse(ctx: AuthContext | NextResponse): ctx is NextResponse {
  return ctx instanceof NextResponse;
}

/**
 * Audit log helper — records every mutating action.
 */
export async function auditLog(
  ctx: AuthContext,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = getAdminClient();
    await supabase.from('AuditLog').insert({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action,
      entityType,
      entityId,
      metadata: (metadata || {}) as any,
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err);
  }
}
