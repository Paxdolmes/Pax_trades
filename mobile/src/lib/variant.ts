import Constants from 'expo-constants';

export type AppVariant = 'customer' | 'pro';

export const appVariant: AppVariant =
  Constants.expoConfig?.extra?.appVariant === 'pro' ? 'pro' : 'customer';
