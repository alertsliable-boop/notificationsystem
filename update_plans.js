const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePlans() {
  await supabase.from('SubscriptionPlan').upsert({ id: 'plan_starter', code: 'starter', name: 'Starter', maxActiveEndpoints: 1, priceCents: 1900 });
  await supabase.from('SubscriptionPlan').upsert({ id: 'plan_pro', code: 'pro', name: 'Professional', maxActiveEndpoints: 5, priceCents: 5900 });
  await supabase.from('SubscriptionPlan').upsert({ id: 'plan_business', code: 'business', name: 'Business', maxActiveEndpoints: 15, priceCents: 12900 });
  
  // Also insert the free trial if not exists
  await supabase.from('SubscriptionPlan').upsert({
    id: 'plan_free_trial',
    code: 'free_trial',
    name: 'Free Trial',
    maxActiveEndpoints: 1,
    priceCents: 0
  });

  console.log("Plans updated successfully.");
}

updatePlans().catch(console.error);
