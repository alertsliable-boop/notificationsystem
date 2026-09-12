import { NextResponse } from 'next/server';
import { requireSuperAdminSession } from '@/lib/adminAuth';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const auth = await requireSuperAdminSession();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { companyId } = body;

    const cookieStore = await cookies();

    // If companyId is empty or 'reset', clear the cookie to return to HQ
    if (!companyId || companyId === 'reset') {
      cookieStore.delete('admin_active_company_id');
      return NextResponse.json({
        success: true,
        message: 'Returned to Liable Alerts HQ workspace',
        activeCompanyId: null,
      });
    }

    // Verify target company exists
    const supabase = getAdminClient();
    const { data: company, error } = await supabase
      .from('Company')
      .select('id, name, slug')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Set cookie for 7 days
    cookieStore.set('admin_active_company_id', companyId, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      message: `Switched active workspace to "${company.name}"`,
      activeCompanyId: company.id,
      company,
    });
  } catch (err: any) {
    console.error('[ADMIN SWITCH WORKSPACE ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to switch workspace' }, { status: 500 });
  }
}
