// The website frame, from the v0 site design: a menu along the top (a sheet on
// narrow screens), a footer, centred sections and the shared building blocks of
// the information pages. On the web it also sits above the booking screens.
// Phones show the information pages under a plain back bar instead.
import { router, usePathname, type Href } from 'expo-router';
import { ArrowRight, ChevronLeft, Menu, X } from 'lucide-react-native';
import { useState, type ReactNode, type Ref } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RelayMark, Wordmark } from '@/components/brand';
import { IconButton, T, type LucideIcon } from '@/components/ui';
import { Radii, SoftShadows, Spacing, usePalette, type ColorToken } from '@/constants/theme';
import { OFFERED_TRADES } from '@/domain/catalog';
import { needsSignIn, useAuth } from '@/lib/auth';

export const isWeb = Platform.OS === 'web';

/** Content width on big screens. */
export const MAX_WIDTH = 1152;

/** Narrow (phone), medium (tablet) or wide (laptop) layout. */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, narrow: width < 640, medium: width >= 640 && width < 1024, wide: width >= 1024 };
}

/** react-native-web adds `hovered` to Pressable's state; phones never set it. */
export const isHovered = (state: object) => Boolean((state as { hovered?: boolean }).hovered);

/** Props that make a Pressable a real link: an <a href> on the web (so it can be
 * opened in a new tab), navigating inside the app when tapped. */
export function linkProps(href: Href, after?: () => void) {
  return {
    accessibilityRole: 'link' as const,
    ...(isWeb ? { href: hrefToUrl(href) } : {}),
    onPress: (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.();
      after?.();
      router.navigate(href);
    },
  };
}

function hrefToUrl(href: Href): string {
  if (typeof href === 'string') return href;
  const { pathname, params } = href as { pathname: string; params?: Record<string, string> };
  const query = new URLSearchParams(params ?? {}).toString();
  return query ? `${pathname}?${query}` : pathname;
}

export const SITE_LINKS: { label: string; href: Href }[] = [
  { label: 'Services', href: '/services' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Prices', href: '/prices' },
  { label: 'Safety', href: '/safety' },
  { label: 'Landlords', href: '/landlords' },
  { label: 'For tradespeople', href: '/for-tradespeople' },
  { label: 'Help', href: '/help' },
];

// Text ------------------------------------------------------------------------

/** Page title: big on laptops, still bold on phones. */
export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { narrow, wide } = useBreakpoint();
  const size = wide ? 60 : narrow ? 40 : 52;
  return (
    <T variant="display" accessibilityRole="header" style={[{ fontSize: size, lineHeight: Math.round(size * 1.08), letterSpacing: -0.025 * size }, style]}>
      {children}
    </T>
  );
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { narrow } = useBreakpoint();
  const size = narrow ? 30 : 38;
  return (
    <T variant="display" accessibilityRole="header" style={[{ fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: -0.02 * size, fontWeight: '700' }, style]}>
      {children}
    </T>
  );
}

export function H3({ children, style, color }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: ColorToken }) {
  return (
    <T variant="title2" color={color} style={style}>
      {children}
    </T>
  );
}

/** Body copy a step bigger than the app's, for reading on a page. */
export function Lead({ children, style, big }: { children: ReactNode; style?: StyleProp<TextStyle>; big?: boolean }) {
  const { narrow } = useBreakpoint();
  const size = big && !narrow ? 20 : 18;
  return (
    <T variant="body" color="inkMuted" style={[{ fontSize: size, lineHeight: Math.round(size * 1.6) }, style]}>
      {children}
    </T>
  );
}

/** Small rounded label above a heading. */
export function Eyebrow({ children, tone = 'teal' }: { children: string; tone?: 'teal' | 'ember' | 'white' }) {
  const c = usePalette();
  const bg = tone === 'teal' ? c.accentTint : tone === 'ember' ? c.urgentTint : c.surface;
  const fg: ColorToken = tone === 'ember' ? 'urgent' : tone === 'teal' ? 'accentStrong' : 'ink';
  return (
    <View style={[styles.eyebrow, { backgroundColor: bg }, tone === 'white' && SoftShadows.soft]}>
      <T variant="subhead" color={fg} style={{ fontWeight: '600' }}>
        {children}
      </T>
    </View>
  );
}

export function SectionHeading({ eyebrow, title, sub, center }: { eyebrow?: string; title: string; sub?: string; center?: boolean }) {
  return (
    <View style={[{ gap: Spacing.three, maxWidth: 680 }, center && { alignSelf: 'center', alignItems: 'center' }]}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <H2 style={center ? { textAlign: 'center' } : undefined}>{title}</H2>
      {sub ? <Lead style={center ? { textAlign: 'center' } : undefined}>{sub}</Lead> : null}
    </View>
  );
}

// Pieces ----------------------------------------------------------------------

type IconTone = 'teal' | 'peach' | 'white' | 'navy';

/** Rounded square with an icon, in one of the site's soft tones. */
export function SiteIcon({ icon: Icon, tone = 'teal', size = 48 }: { icon: LucideIcon; tone?: IconTone; size?: number }) {
  const c = usePalette();
  const tones: Record<IconTone, { bg: string; fg: string }> = {
    teal: { bg: c.accentTint, fg: c.accentStrong },
    peach: { bg: c.urgentTint, fg: c.urgent },
    white: { bg: c.surface, fg: c.accentStrong },
    navy: { bg: c.ink, fg: c.accent },
  };
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.33, alignItems: 'center', justifyContent: 'center', backgroundColor: tones[tone].bg }}>
      <Icon size={Math.round(size * 0.5)} color={tones[tone].fg} strokeWidth={2} />
    </View>
  );
}

type PillVariant = 'primary' | 'secondary' | 'ember' | 'emberSolid' | 'ghost';

/** The site's round-ended button. Give it `href` to make it a real link on the web. */
export function Pill({
  label,
  href,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  trailing = false,
  style,
}: {
  label: string;
  href?: Href;
  onPress?: () => void;
  variant?: PillVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  trailing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const colors: Record<PillVariant, { bg: string; hover: string; fg: ColorToken }> = {
    primary: { bg: c.brand, hover: c.brandPressed, fg: 'onBrand' },
    secondary: { bg: c.surface, hover: c.surfaceMuted, fg: 'ink' },
    ember: { bg: c.urgentTint, hover: '#FFDCC8', fg: 'urgent' },
    emberSolid: { bg: c.urgent, hover: c.urgentPressed, fg: 'onBrand' },
    ghost: { bg: 'transparent', hover: c.surfaceMuted, fg: 'ink' },
  };
  const k = colors[variant];
  const height = size === 'sm' ? 40 : size === 'md' ? 44 : 52;
  return (
    <Pressable
      {...(href ? linkProps(href) : { accessibilityRole: 'button' as const, onPress })}
      style={(state) => [
        styles.pill,
        { height, paddingHorizontal: size === 'lg' ? Spacing.six : Spacing.five, backgroundColor: state.pressed || isHovered(state) ? k.hover : k.bg },
        variant === 'secondary' && { borderWidth: 1, borderColor: c.border },
        variant === 'primary' && SoftShadows.soft,
        style,
      ]}>
      {Icon && !trailing ? <Icon size={17} color={c[k.fg]} strokeWidth={2.2} /> : null}
      <T variant="subhead" color={k.fg} style={{ fontSize: size === 'lg' ? 16 : 15, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </T>
      {Icon && trailing ? <Icon size={17} color={c[k.fg]} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

/** Teal text link with an arrow. */
export function ArrowLink({ label, href, color = 'accentStrong' }: { label: string; href: Href; color?: ColorToken }) {
  const c = usePalette();
  return (
      <Pressable {...linkProps(href)} style={(state) => [styles.arrowLink, isHovered(state) && { opacity: 0.75 }]}>
        <T variant="bodyStrong" color={color} style={{ fontWeight: '700', fontSize: 15 }}>
          {label}
        </T>
        <ArrowRight size={16} color={c[color]} strokeWidth={2.4} />
      </Pressable>
  );
}

/** White card with the site's soft shadow. */
export function SoftCard({ children, style, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: ColorToken }) {
  const c = usePalette();
  return <View style={[styles.card, { backgroundColor: tint ? c[tint] : c.surface }, !tint && SoftShadows.soft, style]}>{children}</View>;
}

/** Lays children out in rows of `columns`, wrapping to fewer on smaller screens. */
export function Grid({ children, columns, gap = Spacing.five }: { children: ReactNode[]; columns: { narrow: number; medium: number; wide: number }; gap?: number }) {
  const bp = useBreakpoint();
  const n = bp.wide ? columns.wide : bp.medium ? columns.medium : columns.narrow;
  const rows: ReactNode[][] = [];
  children.forEach((child, i) => {
    if (i % n === 0) rows.push([]);
    rows[rows.length - 1].push(child);
  });
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((child, i) => (
            <View key={i} style={{ flex: 1, minWidth: 0 }}>
              {child}
            </View>
          ))}
          {Array.from({ length: n - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// Frame -----------------------------------------------------------------------

function NavLink({ label, href, active, onPress, big }: { label: string; href: Href; active: boolean; onPress?: () => void; big?: boolean }) {
  const c = usePalette();
  return (
      <Pressable
        {...linkProps(href, onPress)}
        style={(state) => [
          big ? styles.sheetLink : styles.navLink,
          { backgroundColor: active ? c.accentTint : big && (state.pressed || isHovered(state)) ? c.surfaceMuted : 'transparent' },
        ]}>
        {(state) => (
          <T
            variant={big ? 'title2' : 'subhead'}
            color={active || isHovered(state) || big ? 'ink' : 'inkMuted'}
            style={big ? { fontWeight: '600' } : { fontSize: 15, fontWeight: '500' }}>
            {label}
          </T>
        )}
      </Pressable>
  );
}

/** The website menu. On phones (the app, not the browser) it's a back bar. */
export function SiteHeader({ title }: { title?: string }) {
  const c = usePalette();
  const path = usePathname();
  const { status } = useAuth();
  const guest = needsSignIn(status);
  const { wide, narrow } = useBreakpoint();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  if (!isWeb) {
    return (
      <SafeAreaView edges={['top']} style={{ backgroundColor: c.bg }}>
        <View style={styles.backBar}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <T variant="headline" numberOfLines={1} style={{ flex: 1 }}>
            {title ?? ''}
          </T>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = (href: Href) => typeof href === 'string' && (path === href || path.startsWith(`${href}/`));
  const account: { label: string; href: Href }[] = guest
    ? [{ label: 'Sign in', href: '/sign-in' }]
    : [
        { label: 'My jobs', href: '/my-jobs' },
        { label: 'Account', href: '/account' },
      ];
  const close = () => setOpen(false);

  return (
    <View style={[styles.header, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
      <View style={[styles.headerInner, { paddingHorizontal: narrow ? Spacing.five : Spacing.eight }]}>
        <Pressable {...linkProps('/', close)} accessibilityLabel="Relay home">
          <Wordmark size={30} />
        </Pressable>
        {wide ? (
          <View style={styles.navRow}>
            {SITE_LINKS.map((l) => (
              <NavLink key={l.label} {...l} active={isActive(l.href)} />
            ))}
          </View>
        ) : null}
        <View style={[styles.navRow, { gap: Spacing.two }]}>
          {!narrow
            ? account.map((l) => (
                  <Pressable key={l.label} {...linkProps(l.href)} style={styles.navLink}>
                    {(state) => (
                      <T variant="subhead" color={isHovered(state) || isActive(l.href) ? 'accentStrong' : 'ink'} style={{ fontSize: 15, fontWeight: '600' }}>
                        {l.label}
                      </T>
                    )}
                  </Pressable>
              ))
            : null}
          {!narrow ? <Pill label="Book a job" href="/home" size="sm" /> : null}
          {wide ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={open ? 'Close menu' : 'Open menu'}
              accessibilityState={{ expanded: open }}
              onPress={() => setOpen(!open)}
              style={[styles.menuButton, SoftShadows.soft, { backgroundColor: c.surface }]}>
              {open ? <X size={20} color={c.ink} /> : <Menu size={20} color={c.ink} />}
            </Pressable>
          )}
        </View>
      </View>
      {open && !wide ? (
        <View style={[styles.sheet, { backgroundColor: c.bg, borderTopColor: c.border, height: height - 72 }]}>
          <ScrollView contentContainerStyle={{ padding: Spacing.five, gap: Spacing.six }}>
            <View style={{ gap: Spacing.one }}>
              {SITE_LINKS.map((l) => (
                <NavLink key={l.label} {...l} big active={isActive(l.href)} onPress={close} />
              ))}
            </View>
            <View style={{ gap: Spacing.three }}>
              <Pill label="Book a job" href="/home" size="lg" />
              {account.map((l) => (
                <Pill key={l.label} label={l.label} href={l.href} variant="secondary" size="lg" />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function SiteFooter() {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const columns: { title: string; links: { label: string; href: Href }[] }[] = [
    { title: 'Services', links: OFFERED_TRADES.map((t) => ({ label: t.service, href: { pathname: '/services', params: { trade: t.id } } })) },
    {
      title: 'Company',
      links: [
        { label: 'How it works', href: '/how-it-works' },
        { label: 'Prices', href: '/prices' },
        { label: 'Safety', href: '/safety' },
        { label: 'For landlords', href: '/landlords' },
        { label: 'For tradespeople', href: '/for-tradespeople' },
        { label: 'Help', href: '/help' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms', href: '/terms' },
        { label: 'Privacy', href: '/privacy' },
      ],
    },
  ];
  return (
    <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
      <Container style={{ paddingVertical: narrow ? Spacing.ten : 64, gap: Spacing.ten }}>
        <View style={[styles.footerTop, narrow && { flexDirection: 'column' }]}>
          <View style={{ gap: Spacing.four, maxWidth: 300 }}>
            <Wordmark size={30} />
            <T variant="body" color="inkMuted">
              Vetted local trades at your door. Now in Fulham, SW6.
            </T>
          </View>
          <View style={styles.footerCols}>
            {columns.map((col) => (
              <View key={col.title} style={{ gap: Spacing.three, minWidth: 120 }}>
                <T variant="headline" style={{ fontSize: 14 }}>
                  {col.title}
                </T>
                {col.links.map((l) => (
                    <Pressable key={l.label} {...linkProps(l.href)}>
                      {(state) => (
                        <T variant="callout" color={isHovered(state) ? 'ink' : 'inkMuted'}>
                          {l.label}
                        </T>
                      )}
                    </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.footerBottom, { borderTopColor: c.border }, narrow && { flexDirection: 'column', gap: Spacing.two }]}>
          <T variant="footnote" color="inkMuted">
            © 2026 Relay
          </T>
          <Pressable {...linkProps('/help')}>
            <T variant="footnote" color="inkMuted">
              Contact us
            </T>
          </Pressable>
        </View>
      </Container>
    </View>
  );
}

/** The navy-and-teal mark on a white tile, for call-to-action bands. */
export function MarkTile({ size = 64 }: { size?: number }) {
  const c = usePalette();
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.37, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, SoftShadows.soft]}>
      <RelayMark size={size * 0.62} />
    </View>
  );
}

/** Centres content at the site width, with side gutters. */
export function Container({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { narrow } = useBreakpoint();
  return <View style={[{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: narrow ? Spacing.five : Spacing.eight }, style]}>{children}</View>;
}

/** One full-width band of a page. */
export function Section({
  children,
  background,
  style,
  nativeID,
  tight,
}: {
  children: ReactNode;
  background?: ColorToken;
  style?: StyleProp<ViewStyle>;
  nativeID?: string;
  tight?: boolean;
}) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const pad = tight ? (narrow ? Spacing.six : Spacing.ten) : narrow ? 56 : 88;
  return (
    <View nativeID={nativeID} style={{ backgroundColor: background ? c[background] : undefined }}>
      <Container style={[{ paddingVertical: pad, gap: narrow ? Spacing.eight : Spacing.ten }, style]}>{children}</Container>
    </View>
  );
}

/** The opening of an information page: eyebrow, big title, a sentence or two. */
export function PageIntro({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub: string; children?: ReactNode }) {
  const { narrow } = useBreakpoint();
  return (
    <Container style={{ paddingTop: narrow ? Spacing.ten : 64, paddingBottom: narrow ? Spacing.ten : 56 }}>
      <View style={{ gap: Spacing.five, maxWidth: 760 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <H1>{title}</H1>
        <Lead big>{sub}</Lead>
        {children}
      </View>
    </Container>
  );
}

/** A whole information page: menu, scrolling content, footer. */
export function SitePage({ children, title, scrollRef }: { children: ReactNode; title: string; scrollRef?: Ref<ScrollViewInstance> }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SiteHeader title={title} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexGrow: 1 }}>{children}</View>
        {isWeb ? <SiteFooter /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: 1, zIndex: 10 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.four, height: 72, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  navLink: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radii.pill },
  menuButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', top: 72, left: 0, right: 0, borderTopWidth: 1 },
  sheetLink: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.four, borderRadius: Radii.md },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, borderRadius: Radii.pill },
  arrowLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  eyebrow: { alignSelf: 'flex-start', borderRadius: Radii.pill, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  card: { borderRadius: 24, padding: Spacing.six, gap: Spacing.three },
  backBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  footerTop: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.ten, flexWrap: 'wrap' },
  footerCols: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 64, rowGap: Spacing.eight },
  footerBottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: Spacing.five },
});
