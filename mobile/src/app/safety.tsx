import { CircleCheck, FileCheck2, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Container, Grid, H2, H3, Lead, PageIntro, Section, SectionHeading, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { CtaBand } from '@/components/site/widgets';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { CHECKS, GUARANTEE_CASES, ON_THE_DAY } from '@/content/site';
import { PILOT } from '@/domain/catalog';

export default function Safety() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <SitePage title="How we vet pros">
      <PageIntro
        eyebrow="Safety"
        title="Every pro is checked before their first job"
        sub="You’re letting someone into your home. We take that seriously, and we stay accountable after they leave."
      />
      <Container style={{ paddingBottom: Spacing.ten }}>
        <Grid columns={{ narrow: 1, medium: 2, wide: 3 }}>
          {CHECKS.map((ch) => (
            <View key={ch.title} style={[styles.card, SoftShadows.soft, { backgroundColor: c.surface }]}>
              <SiteIcon icon={ch.icon} />
              <H3>{ch.title}</H3>
              <T variant="body" color="inkMuted">
                {ch.text}
              </T>
            </View>
          ))}
        </Grid>
        <T variant="callout" color="inkMuted" style={{ marginTop: Spacing.five }}>
          Carpenters have their ID and insurance checked. Gas Safe and NICEIC registration only apply to gas and electrical work.
        </T>
      </Container>
      <Container>
        <View style={[styles.guarantee, { backgroundColor: c.ink, padding: narrow ? Spacing.six : 48 }, !wide && { flexDirection: 'column' }]}>
          <View style={{ flex: 1, gap: Spacing.four }}>
            <View style={[styles.shield, { backgroundColor: c.accent }]}>
              <ShieldCheck size={28} color={c.ink} />
            </View>
            <H2 style={{ color: '#FFFFFF' }}>The Relay Guarantee</H2>
            <Lead style={{ color: '#C9CFDD' }}>
              {`Report a problem up to ${PILOT.guaranteeDays} days after the job and we’ll make it right. That might mean sending a pro back, a refund, or paying for repairs.`}
            </Lead>
          </View>
          <View style={{ flex: 1, gap: Spacing.three, justifyContent: 'center' }}>
            {GUARANTEE_CASES.map((g) => (
              <View key={g} style={[styles.case, { backgroundColor: '#15275A' }]}>
                <CircleCheck size={20} color={c.accent} />
                <T variant="bodyStrong" style={{ color: '#FFFFFF' }}>
                  {g}
                </T>
              </View>
            ))}
          </View>
        </View>
      </Container>
      <Section>
        <SectionHeading eyebrow="On the day" title="Looked after from start to finish" />
        <Grid columns={{ narrow: 1, medium: 3, wide: 3 }}>
          {ON_THE_DAY.map((x) => (
            <View key={x.title} style={[styles.card, { backgroundColor: c.accentTint }]}>
              <SiteIcon icon={x.icon} tone="white" />
              <H3>{x.title}</H3>
              <T variant="body" color="inkMuted">
                {x.text}
              </T>
            </View>
          ))}
        </Grid>
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
          <FileCheck2 size={18} color={c.accentStrong} />
          <T variant="body" color="inkMuted">
            Every pro’s profile shows their checked documents and reviews.
          </T>
        </View>
      </Section>
      <CtaBand />
    </SitePage>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: Spacing.six, gap: Spacing.three, flex: 1 },
  guarantee: { flexDirection: 'row', gap: Spacing.eight, borderRadius: 28 },
  shield: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  case: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: 16, paddingHorizontal: Spacing.five, paddingVertical: Spacing.four },
});
