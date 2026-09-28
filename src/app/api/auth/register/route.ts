import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Agreement version identifier — bump this string if the agreement text changes
const RESPONSIBILITY_AGREEMENT_VERSION = 'v1-2026-09-28';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  // Required: account-level responsibility agreement
  responsibilityAgreement: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the recipient responsibility statement to create an account.',
  }),
  // phone and smsConsent intentionally removed — SMS consent belongs on the Add Recipient flow
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      companyName,
      country,
      city,
      timezone,
      responsibilityAgreement,
    } = registerSchema.parse(body);

    // Capture IP for compliance audit
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;

    const supabase = getAdminClient();
    const { data: existingUser } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Generate unique slug for company
    let slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const { data: existingCompany } = await supabase.from('Company').select('*').eq('slug', slug).single();
    if (existingCompany) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const resolvedTimezone = timezone || 'America/New_York';
    const resolvedCountry = country || 'United States';
    const resolvedCity = city || '';

    const { data: newUser } = await supabase
      .from('User')
      .insert({
        name,
        email,
        passwordHash,
        country: resolvedCountry,
        city: resolvedCity,
        timezone: resolvedTimezone,
      })
      .select()
      .single();

    if (!newUser) throw new Error('Failed to create user');

    const { data: company } = await supabase
      .from('Company')
      .insert({
        name: companyName,
        slug,
        country: resolvedCountry,
        city: resolvedCity,
        timezone: resolvedTimezone,
        // Record responsibility agreement acceptance
        responsibilityAgreementAcceptedAt: new Date().toISOString(),
        responsibilityAgreementVersion: RESPONSIBILITY_AGREEMENT_VERSION,
        responsibilityAgreementIp: ipAddress,
      })
      .select()
      .single();

    if (!company) throw new Error('Failed to create company');

    await supabase
      .from('Membership')
      .insert({
        userId: newUser.id,
        companyId: company.id,
        role: 'OWNER',
      });

    // Assign the Free Trial plan
    const { data: defaultPlan } = await supabase
      .from('SubscriptionPlan')
      .select('*')
      .eq('code', 'free_trial')
      .limit(1)
      .single();

    if (defaultPlan) {
      await supabase
        .from('CompanySubscription')
        .insert({
          companyId: company.id,
          planId: defaultPlan.id,
          status: 'TRIALING',
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
    }

    // Record agreement in audit log for compliance
    await supabase.from('AuditLog').insert({
      id: nanoid(),
      companyId: company.id,
      userId: newUser.id,
      action: 'RESPONSIBILITY_AGREEMENT_ACCEPTED',
      entityType: 'Company',
      entityId: company.id,
      metadata: {
        agreementVersion: RESPONSIBILITY_AGREEMENT_VERSION,
        ipAddress,
        acceptedAt: new Date().toISOString(),
        userEmail: email,
        userName: name,
      },
      createdAt: new Date().toISOString(),
    });

    // NOTE: No PhoneRecipient is created here.
    // The account owner's phone number is NOT automatically enrolled as an SMS recipient.
    // SMS recipients must be added explicitly through the Add Recipient flow,
    // which requires individual consent certification and sends an enrollment SMS.

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.errors ? error.errors[0]?.message : error.message || 'Internal Server Error' },
      { status: 400 }
    );
  }
}
