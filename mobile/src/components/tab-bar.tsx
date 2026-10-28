import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';

export type TabSpec = { name: string; label: string; icon: LucideIcon; badge?: boolean };

/** The Relay tab bar: lucide icons, brand blue for the current tab. */
export function makeTabBar(tabs: TabSpec[]) {
  return function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
    const c = usePalette();
    const insets = useSafeAreaInsets();
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
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: Spacing.two },
  tab: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48 },
  badge: { position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
