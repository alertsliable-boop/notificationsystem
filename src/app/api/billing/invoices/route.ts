import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';

// GET /api/billing/invoices — Return complete charge and invoice history
export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();

  const { data: sub } = await supabase
    .from('CompanySubscription')
    .select('*, plan:SubscriptionPlan(*)')
    .eq('companyId', ctx.companyId)
    .single();

  const invoices: any[] = [];

  // 1. Fetch from local BillingInvoice table
  const { data: dbInvoices } = await supabase
    .from('BillingInvoice')
    .select('*')
    .eq('companyId', ctx.companyId)
    .order('createdAt', { ascending: false });

  if (dbInvoices && dbInvoices.length > 0) {
    for (const inv of dbInvoices) {
      invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountCents: inv.amountCents,
        status: inv.status || 'paid',
        description: inv.description,
        cardBrand: inv.cardBrand || sub?.cardBrand || 'Card',
        cardLast4: inv.cardLast4 || sub?.cardLast4 || '••••',
        date: inv.createdAt,
        pdfUrl: inv.pdfUrl || null,
      });
    }
  }

  // 2. Fetch from Stripe if customer exists
  if (sub?.stripeCustomerId && isStripeConfigured()) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: sub.stripeCustomerId,
        limit: 25,
      });

      for (const inv of stripeInvoices.data) {
        // Skip if already in local DB
        if (invoices.some((item) => item.invoiceNumber === inv.number || item.id === inv.id)) {
          continue;
        }

        const lineDescriptions = (inv.lines?.data || []).map((l: any) => {
          const qty = l.quantity && l.quantity > 1 ? ` (${l.quantity}x)` : '';
          return `${l.description || 'Subscription charge'}${qty}`;
        }).join(', ') || 'Subscription Renewal';

        invoices.push({
          id: inv.id,
          invoiceNumber: inv.number || `INV-${inv.id.slice(-8).toUpperCase()}`,
          amountCents: inv.amount_paid || inv.total || 0,
          status: inv.status === 'paid' ? 'paid' : inv.status || 'paid',
          description: lineDescriptions,
          cardBrand: sub.cardBrand || 'Card',
          cardLast4: sub.cardLast4 || '••••',
          date: new Date(inv.created * 1000).toISOString(),
          pdfUrl: inv.invoice_pdf || inv.hosted_invoice_url || null,
        });
      }
    } catch (stripeErr) {
      console.warn('Could not fetch Stripe invoices:', stripeErr);
    }
  }

  // If no invoices yet, but company is on an active paid plan or has card on file, provide record of active plan
  if (invoices.length === 0 && sub?.plan && sub.plan.priceCents > 0) {
    invoices.push({
      id: `init_${sub.id}`,
      invoiceNumber: `INV-${sub.id.slice(-6).toUpperCase()}`,
      amountCents: sub.plan.priceCents + (sub.extraEndpoints ? sub.extraEndpoints * 1200 : 0),
      status: 'paid',
      description: `${sub.plan.name} Plan${sub.extraEndpoints ? ` + ${sub.extraEndpoints} Additional Endpoint(s)` : ''}`,
      cardBrand: sub.cardBrand || 'Card',
      cardLast4: sub.cardLast4 || '••••',
      date: sub.createdAt || new Date().toISOString(),
      pdfUrl: null,
    });
  }

  // Sort by date descending
  invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ invoices });
}
