import { Linking, Platform } from 'react-native';

/** Opens Relay Traders, the tradesperson app; on the web it lives at /traders. */
export function openTradersApp() {
  if (Platform.OS === 'web') window.location.assign('/traders/');
  else void Linking.openURL('https://relay-trade.co.uk/traders/');
}
