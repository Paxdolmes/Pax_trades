// Web build: Stripe's native card sheet isn't available, so live payments need the phone app.
export async function presentSaveCardSheet(_: { customerId: string; ephemeralKey: string; setupIntent: string }): Promise<boolean> {
  throw new Error('Card payments work in the Relay phone app');
}
