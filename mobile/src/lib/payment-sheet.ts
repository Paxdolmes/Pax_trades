// Web build: Stripe's native card sheet isn't available, so this shows Stripe's
// Payment Element (Stripe.js) in an overlay instead. Phones use payment-sheet.native.ts.
// The saved card reaches the profile the same way: Stripe's setup_intent.succeeded webhook.

type StripeJs = {
  elements: (o: object) => { create: (type: 'payment', o?: object) => { mount: (el: HTMLElement) => void } };
  confirmSetup: (o: object) => Promise<{ error?: { message?: string } }>;
};

let stripeJs: Promise<(key: string) => StripeJs> | null = null;

function loadStripeJs() {
  stripeJs ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve((window as unknown as { Stripe: (key: string) => StripeJs }).Stripe);
    script.onerror = () => {
      stripeJs = null;
      reject(new Error('Could not reach Stripe. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return stripeJs;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration>, text?: string) {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
}

/** Opens a card form to save a card for later. Resolves false if the customer closes it. */
export async function presentSaveCardSheet(s: { customerId: string; ephemeralKey: string; setupIntent: string }): Promise<boolean> {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error('Payments are not set up yet');
  const stripe = (await loadStripeJs())(publishableKey);
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const ink = dark ? '#F3F4F1' : '#0D1B3E';

  const elements = stripe.elements({
    clientSecret: s.setupIntent,
    appearance: { theme: dark ? 'night' : 'stripe', variables: { colorPrimary: dark ? '#1ED6C4' : '#0D1B3E', borderRadius: '12px' } },
  });

  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const scrim = el('div', { position: 'fixed', inset: '0', background: 'rgba(7,15,36,0.55)', zIndex: '9999', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: font });
  const sheet = el('div', { background: dark ? '#0D1B3E' : '#FFFFFF', color: ink, width: '100%', maxWidth: '480px', borderRadius: '24px 24px 0 0', padding: '24px 20px calc(20px + env(safe-area-inset-bottom))', boxSizing: 'border-box', maxHeight: '92vh', overflowY: 'auto' });
  const title = el('div', { fontSize: '20px', fontWeight: '700', marginBottom: '4px' }, 'Add a card');
  const note = el('div', { fontSize: '14px', color: dark ? '#9AA6C4' : '#5B6478', marginBottom: '16px' }, "You're only charged once you confirm the job is done.");
  const mount = el('div', { minHeight: '120px' });
  const error = el('div', { color: '#D93636', fontSize: '14px', margin: '12px 0 0', minHeight: '0' });
  const save = el('button', { width: '100%', height: '52px', marginTop: '16px', border: '0', borderRadius: '14px', background: dark ? '#1ED6C4' : '#0D1B3E', color: dark ? '#0D1B3E' : '#FFFFFF', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: font }, 'Save card');
  const cancel = el('button', { width: '100%', height: '48px', marginTop: '8px', border: '0', background: 'transparent', color: dark ? '#9AA6C4' : '#5B6478', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: font }, 'Cancel');
  sheet.append(title, note, mount, error, save, cancel);
  scrim.append(sheet);
  document.body.append(scrim);
  elements.create('payment', { layout: 'tabs' }).mount(mount);

  return new Promise((resolve) => {
    const close = (saved: boolean) => {
      scrim.remove();
      resolve(saved);
    };
    cancel.onclick = () => close(false);
    save.onclick = async () => {
      save.disabled = true;
      save.textContent = 'Saving…';
      error.textContent = '';
      const result = await stripe.confirmSetup({ elements, redirect: 'if_required', confirmParams: { return_url: window.location.href } });
      if (result.error) {
        error.textContent = result.error.message ?? 'That card could not be saved';
        save.disabled = false;
        save.textContent = 'Save card';
        return;
      }
      close(true);
    };
  });
}
