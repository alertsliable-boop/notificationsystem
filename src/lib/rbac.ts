/**
 * RBAC (Role-Based Access Control) utilities.
 * Used server-side in API routes to enforce authorization rules.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { Role } from '@/lib/types';

export interface AuthContext {
  userId: string;
  companyId: string;
  role: Role;
}

export async function getAuthContext(): Promise<AuthContext | { error: string, details?: any }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) { 
    console.error("No session found in getAuthContext"); 
    return { error: 'No valid session. Please sign in again.' }; 
  }

  const supabase = getAdminClient();
  const { data: membership, error } = await supabase
    .from('Membership')
    .select('*')
    .eq('userId', session.user.id)
    .limit(1)
    .single();

  if (error) {
    console.error("Supabase error in getAuthContext:", error);
    return { error: 'Database error while fetching membership: ' + (error.message || JSON.stringify(error)), details: error };
  }
  
  if (!membership) {
    console.error("No membership found in getAuthContext");
    return { error: 'No membership found for your account.' };
  }

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
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error, details: ctx.details }, { status: 401 });
  }
  return ctx as AuthContext;
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
