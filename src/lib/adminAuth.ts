import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const SUPERADMIN_EMAILS = [
  'admin@liablealerts.com',
  process.env.ADMIN_EMAIL,
].filter(Boolean) as string[];

/**
 * Check if an email belongs to a platform superadmin.
 */
export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return SUPERADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase().trim() === normalized);
}

/**
 * Server-side helper to require superadmin authorization.
 * Returns the session if authorized, or a 403 Forbidden response if not.
 */
export async function requireSuperAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 }),
    };
  }

  if (!isSuperAdmin(session.user.email)) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: 'Forbidden. Superadmin access required.' }, { status: 403 }),
    };
  }

  return {
    authorized: true as const,
    session,
  };
}
