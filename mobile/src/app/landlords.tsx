import { ArrowRight, Eye } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Container, Eyebrow, Grid, H1, H2, H3, Lead, Pill, Section, SectionHeading, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { LandlordDiagram } from '@/components/site/landlord-diagram';
import { FaqList } from '@/components/site/widgets';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { LANDLORD_FAQS, LANDLORD_FEATURES, LANDLORD_STEPS } from '@/content/site';

const DASHBOARD = '/properties' as const;
const EXAMPLE = { pathname: '/properties', params: { example: '1' } } as const;

/** For landlords and letting agents: the problem, the fix in one picture, and how to start. */
export default function Landlords() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <SitePage title="For landlords">
      <Container style={{ paddingTop: narrow ? Spacing.ten : 64, paddingBottom: narrow ? Spacing.eight : 48 }}>
        <View style={{ gap: Spacing.five, maxWidth: 820 }}>
          <Eyebrow>For landlords and letting agents</Eyebrow>
          <H1 style={wide ? { fontSize: 60, lineHeight: 64 } : undefined}>Tenant repairs, sorted with one tap.</H1>
          <Lead big style={{ maxWidth: 680 }}>
            Your tenants report repairs in Relay. You approve with one tap. A vetted local pro sorts it out with the tenant directly, and the bill comes to you.
          </Lead>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
            <Pill label="Set up your properties" size="lg" icon={ArrowRight} trailing href={DASHBOARD} />
            <Pill label="See an example dashboard" size="lg" variant="secondary" icon={Eye} href={EXAMPLE} />
          </View>
        </View>
      </Container>

      <Section tight>
        <SectionHeading eyebrow="The problem we fix" title="From six calls and emails to one tap" sub="A leak today means calls back and forth between your tenant, you and a tradesperson. With Relay you only do one thing: say yes." />
        <LandlordDiagram />
      </Section>

      <Section background="surface">
        <SectionHeading eyebrow="Your dashboard" title="Everything you need to manage repairs" />
        <Grid columns={{ narrow: 1, medium: 2, wide: 4 }}>
          {LANDLORD_FEATURES.map((f) => (
            <View key={f.title} style={[styles.card, { backgroundColor: c.bg }]}>
              <SiteIcon icon={f.icon} />
              <H3>{f.title}</H3>
              <T variant="body" color="inkMuted">
                {f.text}
              </T>
            </View>
          ))}
        </Grid>
        <Pill label="See an example dashboard" variant="secondary" icon={Eye} href={EXAMPLE} style={{ alignSelf: 'flex-start' }} />
      </Section>

      <Section>
        <SectionHeading eyebrow="Getting started" title="Three steps, and it’s free" />
        <Grid columns={{ narrow: 1, medium: 3, wide: 3 }}>
          {LANDLORD_STEPS.map((s, i) => (
            <View key={s.title} style={[styles.card, SoftShadows.soft, { backgroundColor: c.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <SiteIcon icon={s.icon} />
                <T variant="subhead" color="accentStrong" style={{ fontWeight: '700' }}>{`Step ${i + 1}`}</T>
              </View>
              <H3>{s.title}</H3>
              <T variant="body" color="inkMuted">
                {s.text}
              </T>
            </View>
          ))}
        </Grid>
      </Section>

      <Section background="surface">
        <SectionHeading eyebrow="Questions" title="What landlords ask us" />
        <FaqList items={LANDLORD_FAQS} />
      </Section>

      <Container style={{ paddingVertical: narrow ? 56 : 88 }}>
        <View style={[styles.cta, { backgroundColor: c.ink }]}>
          <H2 style={{ textAlign: 'center', color: '#FFFFFF' }}>Ready to stop chasing repairs?</H2>
          <Lead style={{ textAlign: 'center', maxWidth: 560, color: '#C9CFDD' }}>Add your first property in a minute. You only pay for the jobs you approve.</Lead>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.three }}>
            <Pill label="Set up your properties" size="lg" variant="emberSolid" icon={ArrowRight} trailing href={DASHBOARD} />
            <Pill label="Talk to us" size="lg" variant="secondary" href="/help" />
          </View>
        </View>
      </Container>
    </SitePage>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: Spacing.six, gap: Spacing.three, flex: 1 },
  cta: { alignItems: 'center', gap: Spacing.five, borderRadius: 28, padding: 56 },
});
