import Stripe from 'stripe';

/**
 * STRIPE ENVIRONMENT SAFETY GUARD
 *
 * Development/staging MUST use test-mode keys (sk_test_...).
 * Live keys (sk_live_...) are ONLY permitted when NODE_ENV === 'production'.
 *
 * This check runs at module load time so any misconfiguration
 * fails immediately — not silently during a billing request.
 */
function validateStripeKey(key: string | undefined): void {
  if (!key || key.includes('REPLACE_WITH') || key.includes('mock')) return; // placeholder — skip

  const isLiveKey = key.startsWith('sk_live_');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isLiveKey && !isProduction) {
    throw new Error(
      '[STRIPE SAFETY] Live Stripe secret key detected in a non-production environment. ' +
      'Development and staging MUST use Stripe test keys (sk_test_...). ' +
      'Set STRIPE_SECRET_KEY to a test key in your .env.local file. ' +
      'Live keys are only permitted when NODE_ENV=production.'
    );
  }
}

const rawKey = process.env.STRIPE_SECRET_KEY;
validateStripeKey(rawKey);

// Use test mock key only if no key is configured at all (local dev without Stripe)
const stripeKey = rawKey && !rawKey.includes('REPLACE_WITH')
  ? rawKey
  : 'sk_test_mock_key_for_development_no_stripe_configured';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-03-31.basil' as any,
  appInfo: {
    name: 'Liable Alerts',
    version: '1.0.0',
  },
});

/**
 * Returns true only if a real (non-mock, non-placeholder) Stripe key is configured.
 */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(
    key &&
    !key.includes('mock') &&
    !key.includes('REPLACE_WITH') &&
    (key.startsWith('sk_test_') || key.startsWith('sk_live_'))
  );
}

/**
 * Returns 'test' | 'live' | 'not_configured'
 */
export function getStripeMode(): 'test' | 'live' | 'not_configured' {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('REPLACE_WITH') || key.includes('mock')) return 'not_configured';
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  return 'not_configured';
}
