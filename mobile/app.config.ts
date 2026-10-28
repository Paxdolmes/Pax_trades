import type { ConfigContext, ExpoConfig } from 'expo/config';

// One codebase, two store apps. Pick with APP_VARIANT=customer|pro (default customer).
const variant = process.env.APP_VARIANT === 'pro' ? 'pro' : 'customer';

const VARIANTS = {
  customer: {
    name: 'Relay',
    slug: 'relay',
    scheme: 'relay',
    bundleId: 'uk.relaytrades.customer',
    easProjectId: '1b6eef7b-828e-4a3c-ab94-22c4038fcf40',
    // Brand colours from the Conduit R refresh: navy for Relay, teal for Relay Traders.
    tile: '#0D1B3E',
    files: '',
    style: 'automatic',
  },
  pro: {
    name: 'Relay Traders',
    slug: 'relay-traders',
    scheme: 'relaytraders',
    bundleId: 'uk.relaytrades.traders',
    easProjectId: 'c1756266-f0b7-43f3-9ec3-8e233b1f0c3f',
    tile: '#1ED6C4',
    files: '-traders',
    style: 'dark', // Relay Traders is always dark
  },
} as const;

const v = VARIANTS[variant];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: v.name,
  slug: v.slug,
  owner: 'relay-trades', // the Expo organisation
  scheme: v.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  icon: `./assets/images/icon${v.files}.png`,
  userInterfaceStyle: v.style,
  ios: {
    bundleIdentifier: v.bundleId,
    supportsTablet: false,
  },
  android: {
    package: v.bundleId,
    adaptiveIcon: {
      backgroundColor: v.tile,
      foregroundImage: `./assets/images/android-icon-foreground${v.files}.png`,
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    ['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.uk.relaytrades', enableGooglePay: true }],
    [
      'expo-image-picker',
      {
        photosPermission: 'Relay uses your photos so you can show the pro what needs fixing.',
        cameraPermission: 'Relay uses your camera so you can show the pro what needs fixing.',
        microphonePermission: 'Relay uses your microphone when you record a short video of the problem.',
      },
    ],
    [
      'expo-location',
      {
        // Only Relay Traders asks; the customer app links the module but never uses it.
        locationWhenInUsePermission:
          variant === 'pro'
            ? 'Relay Traders uses your location while you are online, to send you jobs nearby.'
            : 'Relay uses your location to find tradespeople near you.',
      },
    ],
    ['expo-notifications', { color: v.tile }],
    [
      'expo-splash-screen',
      {
        backgroundColor: v.tile,
        image: `./assets/images/splash-icon${v.files}.png`,
        imageWidth: 120,
      },
    ],
  ],
  web: {
    output: 'single',
    name: v.name,
    shortName: v.name,
    favicon: `./assets/images/favicon${v.files}.png`,
  },
  experiments: {
    // The web build is served from a sub-folder (e.g. /Pax_trades/traders); see scripts/build-web.mjs.
    baseUrl: process.env.EXPO_BASE_URL || undefined,
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: { projectId: v.easProjectId },
    appVariant: variant,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
