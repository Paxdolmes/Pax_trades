// Where a job is, from booked to done, like a parcel tracker. The live job screen
// shows it down the page; the website's front page shows it across.
import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { T, type LucideIcon } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';

/** One stage. `at` is a time ("10:42am"), "Now", or a due time ("by 2pm"). */
export type TimelineStep = { label: string; at?: string; icon?: LucideIcon };

export function Timeline({ steps, current, across }: { steps: TimelineStep[]; current: number; across?: boolean }) {
  const label = `${steps[current]?.label ?? ''}, step ${current + 1} of ${steps.length}`;
  if (across) {
    return (
      <View accessible accessibilityLabel={label} style={{ flexDirection: 'row' }}>
        {steps.map((s, i) => (
          <View key={s.label} style={{ flex: 1, alignItems: 'center', gap: Spacing.two }}>
            {i > 0 ? <Line on={i <= current} style={{ position: 'absolute', top: 23, right: '50%', width: '100%', height: 3 }} /> : null}
            <Dot step={s} state={i < current ? 'done' : i === current ? 'now' : 'later'} size={48} />
            <View style={{ alignItems: 'center' }}>
              <T variant="bodyStrong" color={i <= current ? 'ink' : 'inkSubtle'} style={{ textAlign: 'center', fontWeight: '700' }}>
                {s.label}
              </T>
              {s.at ? (
                <T variant="footnote" color={i === current ? 'accentStrong' : 'inkSubtle'}>
                  {s.at}
                </T>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View accessible accessibilityLabel={label}>
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'later';
        return (
          <View key={s.label} style={{ flexDirection: 'row', gap: Spacing.three, minHeight: i < steps.length - 1 ? 40 : 24 }}>
            <View style={{ alignItems: 'center' }}>
              <Dot step={s} state={state} size={24} />
              {i < steps.length - 1 ? <Line on={i < current} style={{ flex: 1, width: 2, marginVertical: 2 }} /> : null}
            </View>
            <T variant="callout" color={state === 'later' ? 'inkSubtle' : 'ink'} style={{ flex: 1, fontWeight: state === 'now' ? '700' : '500' }}>
              {s.label}
            </T>
            {s.at ? (
              <T variant="footnote" color={state === 'now' ? 'accentStrong' : 'inkSubtle'} style={state === 'now' ? { fontWeight: '700' } : undefined}>
                {s.at}
              </T>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Line({ on, style }: { on: boolean; style: object }) {
  const c = usePalette();
  return <View style={[{ backgroundColor: on ? c.accent : c.border, borderRadius: 2 }, style]} />;
}

/** Done: a teal tick. Now: navy, with the stage's icon. Later: an outline. */
function Dot({ step, state, size }: { step: TimelineStep; state: 'done' | 'now' | 'later'; size: number }) {
  const c = usePalette();
  const Icon = step.icon;
  const icon = Math.round(size * 0.44);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: state === 'done' ? c.accent : state === 'now' ? c.ink : c.surface,
        borderWidth: state === 'later' ? 2 : 0,
        borderColor: c.border,
        boxShadow: state === 'now' ? `0 0 0 ${size > 30 ? 6 : 4}px ${c.accentTint}` : undefined,
      }}>
      {state === 'done' ? (
        <Check size={icon} color={c.onAccent} strokeWidth={3} />
      ) : Icon ? (
        <Icon size={icon} color={state === 'now' ? c.surface : c.inkSubtle} strokeWidth={2.2} />
      ) : state === 'now' ? (
        <View style={{ width: size * 0.34, height: size * 0.34, borderRadius: size, backgroundColor: c.surface }} />
      ) : null}
    </View>
  );
}
