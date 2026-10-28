import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { usePalette } from '@/constants/theme';

/** Relay mark: a lowercase "r" whose shoulder runs on into a forward arrow. */
export function RelayMark({ size = 32, tile, glyph }: { size?: number; tile?: string; glyph?: string }) {
  const c = usePalette();
  const fg = glyph ?? c.onBrand;
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" accessibilityElementsHidden>
      <Rect width="36" height="36" rx="10" fill={tile ?? c.brand} />
      <Path d="M12 26V17.5C12 14.46 14.46 12 17.5 12H25" fill="none" stroke={fg} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 8L25 12L21 16" fill="none" stroke={fg} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** "relay" for customers, "relaytraders" for the tradesperson app. */
export function Wordmark({ size = 28, traders = false }: { size?: number; traders?: boolean }) {
  const c = usePalette();
  const fontSize = Math.round(size * 0.68);
  const word = { fontSize, lineHeight: Math.round(fontSize * 1.15), letterSpacing: -0.04 * fontSize };
  return (
    <View
      accessible
      accessibilityLabel={traders ? 'Relay Traders' : 'Relay'}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.3) }}>
      <RelayMark size={size} />
      <Text>
        <Text style={[word, { fontWeight: '800', color: c.ink }]}>relay</Text>
        {traders ? <Text style={[word, { fontWeight: '500', color: c.brand }]}>traders</Text> : null}
      </Text>
    </View>
  );
}
