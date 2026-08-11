import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_development', {
  apiVersion: '2025-01-27.acacia' as any,
  appInfo: {
    name: 'Liable Alerts',
    version: '1.0.0',
  },
});

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('mock'));
}
