import type { LucideIcon } from 'lucide-react-native';
import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { fontFamily, Layout, Radii, Shadows, Spacing, Type, usePalette, withFont, type ColorToken, type TypeVariant } from '@/constants/theme';

export type { LucideIcon };

/** Full-height page on the warm canvas. Scrolls unless `fixed`; `footer` stays pinned to the bottom. */
export function Screen({
  children,
  footer,
  fixed,
  edges = ['top'],
  background = 'bg',
  contentStyle,
}: {
  children: ReactNode;
  footer?: ReactNode;
  fixed?: boolean;
  edges?: Edge[];
  background?: ColorToken;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const body = [styles.screen, contentStyle];
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c[background] }}>
      {fixed ? (
        <View style={[{ flex: 1 }, body]}>{children}</View>
      ) : (
        <ScrollView contentContainerStyle={body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      )}
      {footer}
    </SafeAreaView>
  );
}

/** Room under a bottom action: the home indicator inset, and never less than 20. */
export function useBottomPadding() {
  return Math.max(useSafeAreaInsets().bottom, Spacing.five) + Spacing.two;
}

/** Pinned bottom bar for a screen's main action. */
export function Footer({ children }: { children: ReactNode }) {
  const c = usePalette();
  const bottom = useBottomPadding();
  return (
    <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: bottom }]}>{children}</View>
  );
}

export function T({
  variant = 'body',
  color = 'ink',
  style,
  children,
  ...rest
}: TextProps & { variant?: TypeVariant; color?: ColorToken; style?: StyleProp<TextStyle> }) {
  const c = usePalette();
  return (
    <Text {...rest} style={withFont([Type[variant], { color: c[color] }, style])}>
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'urgent' | 'success' | 'secondary' | 'outline' | 'ink' | 'ghost';

const buttonColors: Record<ButtonVariant, { bg: ColorToken | null; pressed: ColorToken | null; fg: ColorToken }> = {
  primary: { bg: 'brand', pressed: 'brandPressed', fg: 'onBrand' },
  urgent: { bg: 'urgent', pressed: 'urgentPressed', fg: 'onUrgent' },
  success: { bg: 'success', pressed: 'successStrong', fg: 'onSuccess' },
  secondary: { bg: 'surfaceMuted', pressed: 'border', fg: 'ink' },
  outline: { bg: 'surface', pressed: 'surfaceMuted', fg: 'ink' },
  ink: { bg: 'ink', pressed: 'inkMuted', fg: 'surface' },
  ghost: { bg: null, pressed: 'surfaceMuted', fg: 'inkMuted' },
};

export function Button({
  label,
  sublabel,
  onPress,
  variant = 'primary',
  icon: Icon,
  trailingIcon: Trailing,
  size = 'lg',
  disabled,
  loading,
  style,
}: {
  label: string;
  sublabel?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  size?: 'hero' | 'lg' | 'md';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const s = buttonColors[variant];
  const fg = c[s.fg];
  const height = size === 'hero' ? Layout.touchHero : size === 'lg' ? Layout.buttonHeight : Layout.touchMin;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: pressed && s.pressed ? c[s.pressed] : s.bg ? c[s.bg] : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: c.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {Icon ? <Icon size={20} color={fg} strokeWidth={2.2} /> : null}
          <View style={{ alignItems: 'center' }}>
            <T variant={size === 'hero' ? 'title2' : 'headline'} color={s.fg}>
              {label}
            </T>
            {sublabel ? (
              <T variant="caption" color={s.fg} style={{ opacity: 0.85, fontWeight: '500' }}>
                {sublabel}
              </T>
            ) : null}
          </View>
          {Trailing ? <Trailing size={20} color={fg} strokeWidth={2.2} /> : null}
        </>
      )}
    </Pressable>
  );
}

export type Tone = 'brand' | 'urgent' | 'success' | 'warning' | 'danger' | 'neutral';

/** bg/fg for a tinted chip or tile; `on` is the text colour on a solid fill of fg. */
export const toneColors: Record<Tone, { bg: ColorToken; fg: ColorToken; on: ColorToken }> = {
  brand: { bg: 'brandTint', fg: 'brand', on: 'onBrand' },
  urgent: { bg: 'urgentTint', fg: 'urgent', on: 'onUrgent' },
  success: { bg: 'successTint', fg: 'successStrong', on: 'surface' },
  warning: { bg: 'warningTint', fg: 'warning', on: 'surface' },
  danger: { bg: 'dangerTint', fg: 'danger', on: 'surface' },
  neutral: { bg: 'surfaceMuted', fg: 'inkMuted', on: 'surface' },
};

export function Chip({ label, tone = 'neutral', icon: Icon, solid }: { label: string; tone?: Tone; icon?: LucideIcon; solid?: boolean }) {
  const c = usePalette();
  const t = toneColors[tone];
  const bg = solid ? (tone === 'neutral' ? 'ink' : t.fg) : t.bg;
  const fg: ColorToken = solid ? t.on : t.fg;
  return (
    <View style={[styles.chip, { backgroundColor: c[bg] }]}>
      {Icon ? <Icon size={13} color={c[fg]} strokeWidth={2.5} /> : null}
      <T variant="caption" color={fg}>
        {label}
      </T>
    </View>
  );
}

export function IconTile({ icon: Icon, tone = 'brand', size = 48, solid }: { icon: LucideIcon; tone?: Tone; size?: number; solid?: boolean }) {
  const c = usePalette();
  const t = toneColors[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radii.sm,
        backgroundColor: solid ? c[t.fg] : c[t.bg],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={Math.round(size * 0.46)} color={solid ? c[t.on] : c[t.fg]} strokeWidth={2} />
    </View>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = 'surface',
  size = 44,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  tone?: 'surface' | 'brand' | 'muted';
  size?: number;
}) {
  const c = usePalette();
  const bg = tone === 'brand' ? c.brandTint : tone === 'muted' ? c.surfaceMuted : c.surface;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 },
        tone === 'surface' && Shadows.card,
      ]}>
      <Icon size={21} color={tone === 'brand' ? c.brand : c.ink} strokeWidth={2.1} />
    </Pressable>
  );
}

/** Initials avatar. Real profile photos come from the backend later. */
export function Avatar({ name, size = 44, tone = 'brand', ring }: { name: string; size?: number; tone?: Tone; ring?: boolean }) {
  const c = usePalette();
  const t = toneColors[tone];
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c[t.bg],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2 : 0,
        borderColor: c.surface,
      }}>
      <Text style={{ color: c[t.fg], fontSize: Math.round(size * 0.38), fontFamily: fontFamily('display', '700'), letterSpacing: -0.3 }}>{initials}</Text>
    </View>
  );
}

export function Card({
  children,
  onPress,
  selected,
  selectedTone = 'brand',
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  selectedTone?: 'brand' | 'urgent';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const c = usePalette();
  const box: StyleProp<ViewStyle> = [
    styles.card,
    Shadows.card,
    { backgroundColor: c.surface, borderColor: selected ? c[selectedTone] : 'transparent' },
    style,
  ];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [box, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Radio({ on, tone = 'brand' }: { on: boolean; tone?: 'brand' | 'urgent' }) {
  const c = usePalette();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: on ? c[tone] : c.border,
        backgroundColor: on ? c[tone] : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {on ? <Check size={14} color={tone === 'urgent' ? c.onUrgent : c.onBrand} strokeWidth={3} /> : null}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const c = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.border, marginLeft: inset }} />;
}

export function Grabber() {
  const c = usePalette();
  return <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border }} />;
}

/** Bottom sheet that sits over a map. */
export function Sheet({ children, onLayout }: { children: ReactNode; onLayout?: (e: LayoutChangeEvent) => void }) {
  const c = usePalette();
  const bottom = useBottomPadding();
  return (
    <View onLayout={onLayout} style={[styles.sheet, Shadows.sheet, { backgroundColor: c.surface, paddingBottom: bottom }]}>
      <Grabber />
      {children}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <T variant="overline" color="inkSubtle">
        {children.toUpperCase()}
      </T>
      {right}
    </View>
  );
}

export function ProgressBar({ value, color = 'brand', height = 6 }: { value: number; color?: ColorToken; height?: number }) {
  const c = usePalette();
  return (
    <View accessibilityRole="progressbar" style={{ height, borderRadius: Radii.pill, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height, borderRadius: Radii.pill, backgroundColor: c[color] }} />
    </View>
  );
}

/** Small row of an icon and a muted line of text, e.g. trust and payment notes. */
export function Note({ icon: Icon, children, color = 'inkMuted' }: { icon: LucideIcon; children: ReactNode; color?: ColorToken }) {
  const c = usePalette();
  return (
    <View style={styles.note}>
      <Icon size={16} color={c[color]} strokeWidth={2.2} style={{ marginTop: 2 }} />
      <T variant="footnote" color={color} style={{ flex: 1 }}>
        {children}
      </T>
    </View>
  );
}

/** A row of numbered stages with the done ones ticked, like a parcel tracker. */
export function ProgressSteps({ steps, current }: { steps: string[]; current: number }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center', gap: Spacing.two }}>
            {i > 0 ? (
              <View style={{ position: 'absolute', top: 11, right: '50%', width: '100%', height: 2, backgroundColor: i <= current ? c.brand : c.border }} />
            ) : null}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? c.brand : c.surface,
                borderWidth: active ? 6 : done ? 0 : 2,
                borderColor: active ? c.brand : c.border,
              }}>
              {done ? <Check size={14} color={c.onBrand} strokeWidth={3} /> : null}
            </View>
            <T variant="caption" color={done || active ? 'ink' : 'inkSubtle'}>
              {label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.two, paddingBottom: Spacing.six, gap: Spacing.five },
  footer: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.four, gap: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.five, borderRadius: Radii.md },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: Radii.pill },
  card: { borderRadius: Radii.lg, borderWidth: 2, padding: Spacing.four },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.three,
    gap: Spacing.five,
  },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -Spacing.two },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
});
