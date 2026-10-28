import { BadgeCheck, ChevronRight, Clock3, Flame, GraduationCap, Info, Plus, ShieldCheck, TriangleAlert, Upload, Zap, Droplets } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Divider, Footer, IconTile, Screen, T, type LucideIcon, type Tone } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import type { CredentialType } from '@/domain/catalog';
import { credentialStatus, type CredentialStatus } from '@/domain/rules';
import { CREDENTIAL_LABELS, CREDENTIAL_UNLOCKS, DEMO_PRO_CREDENTIALS } from '@/lib/demo';
import { today } from '@/lib/offers';

const ICONS: Record<CredentialType, LucideIcon> = {
  gas_safe: Flame,
  public_liability: ShieldCheck,
  plumbing_nvq: GraduationCap,
  competent_person_scheme: Zap,
  unvented_g3: Droplets,
};

const STATUS: Record<CredentialStatus, { label: string; tone: Tone; icon?: LucideIcon }> = {
  verified: { label: 'Verified', tone: 'success', icon: BadgeCheck },
  expiring: { label: 'Expires soon', tone: 'warning', icon: TriangleAlert },
  expired: { label: 'Expired', tone: 'danger', icon: TriangleAlert },
  pending: { label: 'Being checked', tone: 'brand', icon: Clock3 },
  missing: { label: 'Not uploaded', tone: 'neutral' },
};

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Documents() {
  const c = usePalette();
  const date = today();
  const docs = (Object.keys(CREDENTIAL_LABELS) as CredentialType[])
    .map((type) => {
      const held = DEMO_PRO_CREDENTIALS.find((x) => x.type === type);
      return { type, held, status: credentialStatus(held, date) };
    })
    .sort((a, b) => Number(a.status === 'missing') - Number(b.status === 'missing'));
  const verified = docs.filter((d) => d.status === 'verified' || d.status === 'expiring').length;
  const upload = () => Alert.alert('Upload a document', 'Take a photo or choose a PDF. The Relay team checks it, usually within a day.');

  return (
    <Screen
      footer={
        <Footer>
          <Button label="Upload a document" icon={Upload} onPress={upload} />
        </Footer>
      }>
      <View style={{ gap: 2 }}>
        <T variant="title1" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
          Documents
        </T>
        <T variant="callout" color="inkMuted">
          {`${verified} of ${docs.length} verified · checked by the Relay team`}
        </T>
      </View>

      <View style={[styles.info, { backgroundColor: c.brandTint }]}>
        <Info size={20} color={c.brand} strokeWidth={2.5} />
        <T variant="callout" color="brandPressed" style={{ flex: 1 }}>
          Each job type unlocks once the documents it needs are checked and in date.
        </T>
      </View>

      <Card style={{ padding: 0 }}>
        {docs.map((d, i) => {
          const s = STATUS[d.status];
          const missing = d.status === 'missing';
          const detail = missing
            ? CREDENTIAL_UNLOCKS[d.type]
            : d.held?.expiresOn
              ? `${d.status === 'expired' ? 'Expired' : 'Expires'} ${formatDate(d.held.expiresOn)}`
              : 'No expiry';
          return (
            <View key={d.type}>
              {i > 0 ? <Divider inset={72} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${CREDENTIAL_LABELS[d.type]}, ${s.label}. ${detail}`}
                onPress={missing ? upload : undefined}
                style={styles.row}>
                <IconTile icon={ICONS[d.type]} tone={missing ? 'neutral' : s.tone} size={44} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T variant="bodyStrong" numberOfLines={1}>
                    {CREDENTIAL_LABELS[d.type]}
                  </T>
                  <Chip label={s.label} tone={s.tone} icon={s.icon} />
                  <T variant="caption" color={d.status === 'expiring' ? 'warning' : 'inkMuted'} style={{ fontWeight: '500' }} numberOfLines={1}>
                    {detail}
                  </T>
                </View>
                {missing ? (
                  <View style={[styles.add, { backgroundColor: c.brand }]}>
                    <Plus size={22} color={c.onBrand} strokeWidth={2.75} />
                  </View>
                ) : (
                  <ChevronRight size={22} color={c.inkSubtle} />
                )}
              </Pressable>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', gap: Spacing.three, borderRadius: Radii.md, padding: Spacing.three, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, minHeight: 76 },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
