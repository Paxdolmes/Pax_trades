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
    name: 'Relay Pro',
    slug: 'relay-pro',
    scheme: 'relaypro',
    bundleId: 'uk.relaytrades.pro',
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
      'expo-splash-screen',
      {
        backgroundColor: '#1F4FD8',
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
