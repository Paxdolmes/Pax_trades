import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';

let ready: Promise<void> | null = null;

/** Opens Stripe's card sheet to save a card for later. Resolves false if the customer closes it. */
export async function presentSaveCardSheet(s: { customerId: string; ephemeralKey: string; setupIntent: string }): Promise<boolean> {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error('Payments are not set up yet');
  ready ??= initStripe({ publishableKey, merchantIdentifier: 'merchant.uk.relaytrades', urlScheme: 'relay' });
  await ready;

  const init = await initPaymentSheet({
    merchantDisplayName: 'Relay',
    customerId: s.customerId,
    customerEphemeralKeySecret: s.ephemeralKey,
    setupIntentClientSecret: s.setupIntent,
    returnURL: 'relay://stripe-redirect',
    applePay: { merchantCountryCode: 'GB' },
    googlePay: { merchantCountryCode: 'GB', testEnv: publishableKey.startsWith('pk_test_') },
  });
  if (init.error) throw new Error(init.error.message);
  const result = await presentPaymentSheet();
  if (result.error) {
    if (result.error.code === 'Canceled') return false;
    throw new Error(result.error.message);
  }
  return true;
}
