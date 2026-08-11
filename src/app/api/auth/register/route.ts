import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, companyName } = registerSchema.parse(body);

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

    const { data: newUser } = await supabase
      .from('User')
      .insert({
        name,
        email,
        passwordHash,
      })
      .select()
      .single();

    if (!newUser) throw new Error('Failed to create user');

    const { data: company } = await supabase
      .from('Company')
      .insert({
        name: companyName,
        slug,
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

    // Assign a default free plan
    const { data: defaultPlan } = await supabase
      .from('SubscriptionPlan')
      .select('*')
      .eq('maxActiveEndpoints', 5)
      .limit(1)
      .single();

    if (defaultPlan) {
      await supabase
        .from('CompanySubscription')
        .insert({
          companyId: company.id,
          planId: defaultPlan.id,
          status: 'ACTIVE',
        });
    }

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.errors || 'Internal Server Error' },
      { status: 400 }
    );
  }
}
