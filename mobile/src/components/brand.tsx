import { Text, View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { fontFamily, useScheme } from '@/constants/theme';

// "Conduit R" from the v0 brand board: an R bent from one length of pipe, its leg
// shot out in teal as the hand-off. Path data on a 36x36 grid; the PNG icons in
// assets/images (app icons, splash, favicons) are rendered from the same paths.
export const MARK_PATHS = { body: 'M11 29V7H19.5A6.5 6.5 0 0 1 19.5 20H11', leg: 'M19 20L26 29' } as const;
export const MARK_STROKE = 4.5;

const NAVY = '#0D1B3E';
const TEAL = '#1ED6C4';
const TEAL_DEEP = '#008F80';

/** The mark on its own, coloured for the current light or dark background. */
export function RelayMark({ size = 32, body, leg }: { size?: number; body?: string; leg?: string }) {
  const dark = useScheme() === 'dark';
  const stroke = { strokeWidth: MARK_STROKE, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" accessibilityElementsHidden>
      <Path d={MARK_PATHS.body} stroke={body ?? (dark ? '#FFFFFF' : NAVY)} {...stroke} />
      <Path d={MARK_PATHS.leg} stroke={leg ?? (dark ? TEAL : TEAL_DEEP)} {...stroke} />
    </Svg>
  );
}

/** App icon tile: navy for Relay, teal for Relay Traders, so the two split at a glance. */
export function AppIcon({ size = 64, traders = false }: { size?: number; traders?: boolean }) {
  const scale = 21;
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityElementsHidden>
      <Rect width="1024" height="1024" rx="229" fill={traders ? TEAL : NAVY} />
      <G transform={`translate(${512 - 18.5 * scale} ${512 - 18 * scale}) scale(${scale})`}>
        <Path d={MARK_PATHS.body} stroke={traders ? NAVY : '#FFFFFF'} strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d={MARK_PATHS.leg} stroke={traders ? '#FFFFFF' : TEAL} strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>
    </Svg>
  );
}

/** "relay" for customers, "relaytraders" for the tradesperson app. */
export function Wordmark({ size = 28, traders = false }: { size?: number; traders?: boolean }) {
  const dark = useScheme() === 'dark';
  const fontSize = Math.round(size * 0.78);
  const word = { fontSize, lineHeight: Math.round(fontSize * 1.15), letterSpacing: -0.035 * fontSize };
  return (
    <View
      accessible
      accessibilityLabel={traders ? 'Relay Traders' : 'Relay'}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.22) }}>
      <RelayMark size={size} />
      <Text>
        <Text style={[word, { fontFamily: fontFamily('display', '800'), color: dark ? '#FFFFFF' : NAVY }]}>relay</Text>
        {traders ? <Text style={[word, { fontFamily: fontFamily('display', '600'), color: dark ? TEAL : TEAL_DEEP }]}>traders</Text> : null}
      </Text>
    </View>
  );
}
