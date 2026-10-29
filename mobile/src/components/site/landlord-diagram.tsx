// The landlord pitch in one picture: how a repair goes today, passed back and forth
// between tenant, agent and tradesperson, and how it goes with Relay.
import { ArrowDown, ArrowLeftRight, ArrowRight, Building2, Camera, CircleCheck, HardHat, Phone, ReceiptPoundSterling, User, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette, type ColorToken } from '@/constants/theme';

import { H3, useBreakpoint } from './frame';

type Actor = 'tenant' | 'agent' | 'pro';

const ACTORS: Record<Actor, { label: string; icon: LucideIcon }> = {
  tenant: { label: 'Tenant', icon: User },
  agent: { label: 'You', icon: Building2 },
  pro: { label: 'Tradesperson', icon: HardHat },
};

type Step = { from: Actor; to: Actor; both?: boolean; text: string };

const TODAY: Step[] = [
  { from: 'tenant', to: 'agent', text: 'Tenant phones or emails you about the leak' },
  { from: 'agent', to: 'pro', text: 'You ring round to find someone free' },
  { from: 'pro', to: 'agent', text: 'They call back for details, photos and access' },
  { from: 'agent', to: 'tenant', text: 'You chase the tenant for a time that suits' },
  { from: 'tenant', to: 'pro', both: true, text: 'Tenant and tradesperson rearrange the visit' },
  { from: 'pro', to: 'agent', text: 'An invoice arrives. You work out which property it was' },
];

const WITH_RELAY: { icon: LucideIcon; actor: Actor; title: string; text: string; you?: boolean }[] = [
  { icon: Camera, actor: 'tenant', title: 'Tenant reports it in Relay', text: 'What’s wrong, with photos, in two minutes.' },
  { icon: CircleCheck, actor: 'agent', title: 'You tap Approve', text: 'You see the job and the price first. That’s your only step.', you: true },
  { icon: HardHat, actor: 'pro', title: 'A vetted pro sorts it with the tenant', text: 'They agree the visit in the app and fix it.' },
  { icon: ReceiptPoundSterling, actor: 'agent', title: 'One bill, filed under the property', text: 'Spend per property, ready for the owner.' },
];

function ActorPill({ actor, tone }: { actor: Actor; tone: 'muted' | 'strong' }) {
  const c = usePalette();
  const { label, icon: Icon } = ACTORS[actor];
  const you = actor === 'agent';
  const bg: ColorToken = tone === 'strong' && you ? 'brand' : 'surface';
  const fg: ColorToken = tone === 'strong' && you ? 'onBrand' : 'ink';
  return (
    <View style={[styles.actor, { backgroundColor: c[bg], borderColor: c.border }]}>
      <Icon size={13} color={c[fg]} strokeWidth={2.4} />
      <T variant="caption" color={fg}>
        {label}
      </T>
    </View>
  );
}

/** Today versus with Relay, side by side on a laptop and stacked on a phone. */
export function LandlordDiagram() {
  const c = usePalette();
  const { wide } = useBreakpoint();
  return (
    <View style={[styles.panels, !wide && { flexDirection: 'column' }]}>
      <View style={[styles.panel, wide && { flex: 1 }, { backgroundColor: c.urgentTint }]}>
        <View style={styles.panelHead}>
          <T variant="overline" color="urgent">
            TODAY
          </T>
          <H3>Six calls and emails for one leak</H3>
        </View>
        <View style={{ gap: Spacing.two }}>
          {TODAY.map((s, i) => (
            <View key={s.text} style={[styles.todayRow, { backgroundColor: c.surface }]}>
              <View style={[styles.num, { backgroundColor: c.urgentTint }]}>
                <T variant="caption" color="urgent">
                  {String(i + 1)}
                </T>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.pills}>
                  <ActorPill actor={s.from} tone="muted" />
                  {s.both ? <ArrowLeftRight size={14} color={c.inkSubtle} /> : <ArrowRight size={14} color={c.inkSubtle} />}
                  <ActorPill actor={s.to} tone="muted" />
                </View>
                <T variant="footnote" color="inkMuted">
                  {s.text}
                </T>
              </View>
              {s.from === 'agent' || s.to === 'agent' ? <Phone size={16} color={c.urgent} /> : null}
            </View>
          ))}
        </View>
        <T variant="subhead" color="urgent" style={{ fontWeight: '700' }}>
          Days of back and forth, with you in the middle of every call.
        </T>
      </View>

      <View style={[styles.panel, wide && { flex: 1 }, { backgroundColor: c.accentTint }]}>
        <View style={styles.panelHead}>
          <T variant="overline" color="accentStrong">
            WITH RELAY
          </T>
          <H3>One tap from you</H3>
        </View>
        <View>
          {WITH_RELAY.map((s, i) => {
            const Icon = s.icon;
            return (
              <View key={s.title}>
                <View style={[styles.relayRow, SoftShadows.soft, { backgroundColor: c.surface, borderColor: s.you ? c.accentStrong : 'transparent' }]}>
                  <View style={[styles.relayIcon, { backgroundColor: s.you ? c.brand : c.accentTint }]}>
                    <Icon size={20} color={s.you ? c.onBrand : c.accentStrong} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <ActorPill actor={s.actor} tone="strong" />
                    <T variant="bodyStrong">{s.title}</T>
                    <T variant="footnote" color="inkMuted">
                      {s.text}
                    </T>
                  </View>
                </View>
                {i < WITH_RELAY.length - 1 ? (
                  <View style={styles.arrow}>
                    <ArrowDown size={18} color={c.accentStrong} strokeWidth={2.4} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <T variant="subhead" color="accentStrong" style={{ fontWeight: '700' }}>
          Emergencies can skip the wait and go straight to a pro.
        </T>
      </View>
    </View>
  );
}

/** The same story in one line, for the front page. */
export function LandlordFlowStrip({ dark }: { dark?: boolean }) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const steps = ['Tenant reports it', 'You tap Approve', 'A vetted pro fixes it', 'The bill comes to you'];
  return (
    <View style={[styles.strip, narrow && { flexDirection: 'column', alignItems: 'stretch' }]}>
      {steps.map((s, i) => (
        <View key={s} style={[styles.stripStep, narrow && { flexDirection: 'row' }]}>
          <View style={[styles.stripChip, { backgroundColor: i === 1 ? c.accent : dark ? '#15275A' : c.surface, flex: narrow ? 1 : undefined }]}>
            <T variant="subhead" style={{ fontWeight: '700', color: i === 1 ? c.onAccent : dark ? '#FFFFFF' : c.ink }}>
              {s}
            </T>
          </View>
          {i < steps.length - 1 && !narrow ? <ArrowRight size={18} color={dark ? '#C9CFDD' : c.inkSubtle} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panels: { flexDirection: 'row', gap: Spacing.five, alignItems: 'stretch' },
  panel: { borderRadius: 28, padding: Spacing.six, gap: Spacing.five },
  panelHead: { gap: Spacing.two },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: 16, padding: Spacing.three },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  actor: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  relayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, borderRadius: 20, padding: Spacing.four, borderWidth: 2 },
  relayIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  arrow: { alignItems: 'center', paddingVertical: 6 },
  strip: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.three },
  stripStep: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stripChip: { borderRadius: 999, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
});
