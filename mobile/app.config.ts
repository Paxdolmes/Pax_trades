import type { ConfigContext, ExpoConfig } from 'expo/config';

// One codebase, two store apps. Pick with APP_VARIANT=customer|pro (default customer).
const variant = process.env.APP_VARIANT === 'pro' ? 'pro' : 'customer';

const VARIANTS = {
  customer: {
    name: 'Relay',
    slug: 'relay',
    scheme: 'relay',
    bundleId: 'uk.relaytrades.customer',
  },
  pro: {
    name: 'Relay Traders',
    slug: 'relay-traders',
    scheme: 'relaytraders',
    bundleId: 'uk.relaytrades.traders',
  },
} as const;

const v = VARIANTS[variant];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: v.name,
  slug: v.slug,
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
    [
      'expo-image-picker',
      {
        photosPermission: 'Relay uses your photos so you can show the pro what needs fixing.',
        cameraPermission: 'Relay uses your camera so you can show the pro what needs fixing.',
        microphonePermission: 'Relay uses your microphone when you record a short video of the problem.',
      },
    ],
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
    appVariant: variant,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
