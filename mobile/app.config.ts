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
  },
  pro: {
    name: 'Relay Traders',
    slug: 'relay-traders',
    scheme: 'relaytraders',
    bundleId: 'uk.relaytrades.traders',
    easProjectId: 'c1756266-f0b7-43f3-9ec3-8e233b1f0c3f',
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
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: v.bundleId,
    supportsTablet: false,
  },
  android: {
    package: v.bundleId,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
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
      { locationWhenInUsePermission: 'Relay Traders uses your location while you are online, to send you jobs nearby.' },
    ],
    ['expo-notifications', { color: '#1B44C4' }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1B44C4',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
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
