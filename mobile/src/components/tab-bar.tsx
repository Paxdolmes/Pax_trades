import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand';
import { T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { appVariant } from '@/lib/variant';

export type TabSpec = { name: string; label: string; icon: LucideIcon; badge?: boolean };

/** Wide enough for the tabs to sit along the top, like a website's menu. Phones and phone-sized browsers keep them at the bottom. */
export const TOP_TABS_WIDTH = 720;

export function useTabBarPosition() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= TOP_TABS_WIDTH ? 'top' : 'bottom';
}

/** The Relay tab bar: lucide icons, brand blue for the current tab. */
export function makeTabBar(tabs: TabSpec[]) {
  return function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
    const c = usePalette();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    if (Platform.OS === 'web' && width >= TOP_TABS_WIDTH) {
      return (
        <View style={[styles.top, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <View style={[styles.topInner, { paddingHorizontal: Spacing.six }]}>
            <Wordmark size={26} traders={appVariant === 'pro'} />
            <View style={styles.topTabs}>
              {state.routes.map((route, index) => {
                const tab = tabs.find((t) => t.name === route.name);
                if (!tab) return null;
                const focused = state.index === index;
                return (
                  <Pressable
                    key={route.key}
                    accessibilityRole="tab"
                    accessibilityLabel={tab.label}
                    accessibilityState={{ selected: focused }}
                    onPress={() => {
                      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
                    }}
                    style={(state) => [
                      styles.topTab,
                      styles.topTabRow,
                      { backgroundColor: focused ? c.brandTint : (state as { hovered?: boolean }).hovered ? c.surfaceMuted : 'transparent' },
                    ]}>
                    <View>
                      <tab.icon size={18} color={focused ? c.brand : c.inkMuted} strokeWidth={focused ? 2.4 : 2} />
                      {tab.badge ? <View style={[styles.badge, { backgroundColor: c.danger, borderColor: c.surface }]} /> : null}
                    </View>
                    <T variant="subhead" color={focused ? 'brand' : 'inkMuted'} style={{ fontWeight: '600', fontSize: 15 }}>
                      {tab.label}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        {state.routes.map((route, index) => {
          const tab = tabs.find((t) => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const color = focused ? c.brand : c.inkSubtle;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              style={styles.tab}>
              <View>
                <tab.icon size={24} color={color} strokeWidth={focused ? 2.4 : 2} />
                {tab.badge ? <View style={[styles.badge, { backgroundColor: c.danger, borderColor: c.surface }]} /> : null}
              </View>
              <T variant="caption" color={focused ? 'brand' : 'inkSubtle'} style={{ fontSize: 12 }}>
                {tab.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    );
  };
}

const styles = StyleSheet.create({
  top: { borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  topInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.four, minHeight: 64, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  topTabs: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  topTab: { alignItems: 'center', gap: 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radii.pill },
  topTabRow: { flexDirection: 'row', gap: Spacing.two },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: Spacing.two },
  tab: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48 },
  badge: { position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
