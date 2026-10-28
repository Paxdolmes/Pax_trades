import type { LucideIcon } from 'lucide-react-native';
import { House, Lock, Wrench, Zap } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { Shadows, usePalette } from '@/constants/theme';

// Static Fulham basemap (OpenStreetMap, zoom 15, 1024 x 1024 px). It stands in
// for react-native-maps until live locations are wired up. Points are pixel
// positions on that image.
const MAP_SIZE = 1024;
const lightMap = require('@/assets/images/map-fulham-light.jpg');
const darkMap = require('@/assets/images/map-fulham-dark.jpg');

export type Point = { x: number; y: number };

export const PLACES = {
  fulhamBroadway: { x: 588, y: 296 },
  parsonsGreen: { x: 425, y: 505 },
  letticeSt: { x: 356, y: 512 },
  peterboroughRd: { x: 492, y: 628 },
  bovingdonRd: { x: 684, y: 470 },
  munsterRd: { x: 248, y: 392 },
} satisfies Record<string, Point>;

/** Demo drive from Fulham Broadway to Lettice Street. */
export const DEMO_ROUTE: Point[] = [
  PLACES.fulhamBroadway,
  { x: 560, y: 352 },
  { x: 502, y: 420 },
  { x: 440, y: 486 },
  { x: 398, y: 506 },
  PLACES.letticeSt,
];

export type Pin = Point & { kind: 'me' | 'home' | 'job' | 'urgent' | 'locked' | 'pro' | 'dot'; label?: string };

export function StaticMap({
  height,
  center,
  scale = 1,
  pins = [],
  route,
  radius = 0,
  style,
  children,
}: {
  height: number;
  center: Point;
  scale?: number;
  pins?: Pin[];
  route?: Point[];
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Extra overlays, given a function from map points to screen points. */
  children?: (project: (p: Point) => Point) => ReactNode;
}) {
  const c = usePalette();
  const dark = useColorScheme() === 'dark';
  const [width, setWidth] = useState(0);
  const project = (p: Point) => ({ x: (p.x - center.x) * scale + width / 2, y: (p.y - center.y) * scale + height / 2 });
  const origin = project({ x: 0, y: 0 });

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Map of Fulham, SW6"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height, overflow: 'hidden', borderRadius: radius, backgroundColor: c.surfaceMuted }, style]}>
      {width > 0 ? (
        <>
          <Image
            source={dark ? darkMap : lightMap}
            style={{ position: 'absolute', left: origin.x, top: origin.y, width: MAP_SIZE * scale, height: MAP_SIZE * scale }}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(10,15,28,0.35)' : 'rgba(255,255,255,0.22)' }]} />
          {route ? (
            <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
              <Polyline
                points={route.map((p) => `${project(p).x},${project(p).y}`).join(' ')}
                fill="none"
                stroke={c.surface}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={route.map((p) => `${project(p).x},${project(p).y}`).join(' ')}
                fill="none"
                stroke={c.brand}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
          {children?.(project)}
          {pins.map((pin, i) => (
            <MapPin key={i} {...project(pin)} kind={pin.kind} label={pin.label} />
          ))}
          <Text style={[styles.credit, { color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(15,26,46,0.55)' }]}>
            © OpenStreetMap contributors
          </Text>
        </>
      ) : null}
    </View>
  );
}

const pinIcons: Partial<Record<Pin['kind'], LucideIcon>> = { home: House, job: Wrench, urgent: Zap, locked: Lock };

function MapPin({ x, y, kind, label }: Point & { kind: Pin['kind']; label?: string }) {
  const c = usePalette();
  if (kind === 'dot') {
    return <View style={[styles.dot, { left: x - 7, top: y - 7, backgroundColor: c.inkMuted, borderColor: c.surface }, Shadows.card]} />;
  }
  if (kind === 'me') {
    return (
      <View style={{ position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, opacity: 0.18 }} />
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.brand, borderWidth: 3, borderColor: '#FFFFFF' }} />
      </View>
    );
  }
  if (kind === 'pro') {
    return (
      <View style={{ position: 'absolute', left: x - 60, top: y - 64, width: 120, alignItems: 'center', gap: 6 }}>
        {label ? (
          <View style={[styles.etaBubble, { backgroundColor: c.surface }, Shadows.float]}>
            <View style={[styles.etaTag, { backgroundColor: c.brand }]}>
              <Text style={styles.etaText}>{label}</Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.proPin, { backgroundColor: c.brand, borderColor: c.surface }, Shadows.float]}>
          <Wrench size={18} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      </View>
    );
  }
  const Icon = pinIcons[kind] ?? Wrench;
  const size = kind === 'home' ? 44 : 32;
  const bg = kind === 'urgent' ? c.urgent : kind === 'locked' ? c.inkSubtle : kind === 'home' ? c.ink : c.brand;
  return (
    <View
      style={[
        { position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: bg, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
        Shadows.float,
      ]}>
      <Icon size={kind === 'home' ? 18 : 14} color="#FFFFFF" strokeWidth={2.6} />
    </View>
  );
}

const styles = StyleSheet.create({
  credit: { position: 'absolute', right: 6, bottom: 4, fontSize: 9 },
  dot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  etaBubble: { borderRadius: 999, padding: 4 },
  etaTag: { borderRadius: 999, paddingHorizontal: 10, height: 24, justifyContent: 'center' },
  etaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  proPin: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
