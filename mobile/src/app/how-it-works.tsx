import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Container, H2, headingLevel, Lead, PageIntro, Pill, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { CtaBand } from '@/components/site/widgets';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { JOURNEY } from '@/content/site';
import { PILOT } from '@/domain/catalog';

export default function HowItWorks() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <SitePage title="How it works">
      <PageIntro
        eyebrow="How it works"
        title="From “oh no” to sorted, without the stress"
        sub="Booking takes about two minutes. Here’s what happens from the moment you tell us what’s wrong."
      />
      <Container style={{ gap: Spacing.five, paddingBottom: Spacing.ten }}>
        {JOURNEY.map((step, i) => (
          <View
            key={step.title}
            style={[styles.step, SoftShadows.soft, { backgroundColor: c.surface }, wide && i % 2 === 1 && { flexDirection: 'row-reverse' }, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={[styles.art, { backgroundColor: step.tone === 'teal' ? c.accentTint : c.urgentTint, width: wide ? 300 : undefined }]}>
              <SiteIcon icon={step.icon} tone="white" size={72} />
              <View style={[styles.line, { backgroundColor: c.surface, width: 120 }]} />
              <View style={[styles.line, { backgroundColor: c.surface, width: 80, opacity: 0.7 }]} />
            </View>
            <View style={{ flex: wide ? 1 : undefined, gap: Spacing.three, padding: narrow ? Spacing.two : Spacing.four }}>
              <T variant="subhead" color="accentStrong" style={{ fontWeight: '700' }}>
                {`Step ${i + 1}`}
              </T>
              <T variant="display" accessibilityRole="header" {...headingLevel(2)} style={{ fontSize: narrow ? 26 : 32, lineHeight: narrow ? 31 : 38 }}>
                {step.title}
              </T>
              <Lead>{step.text}</Lead>
            </View>
          </View>
        ))}
      </Container>
      <Container>
        <View style={[styles.wrong, { backgroundColor: c.accentTint }, !wide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <SiteIcon icon={ShieldCheck} tone="white" size={56} />
          <View style={{ flex: 1, gap: Spacing.two }}>
            <H2 style={{ fontSize: 28, lineHeight: 34 }}>What if something goes wrong?</H2>
            <Lead>
              {`Every job is covered by the Relay Guarantee. If the problem isn’t fixed, something gets damaged, your pro doesn’t turn up or you’ve been overcharged, tell us within ${PILOT.guaranteeDays} days and we’ll put it right.`}
            </Lead>
          </View>
          <Pill label="About the guarantee" variant="secondary" href="/safety" />
        </View>
      </Container>
      <CtaBand />
    </SitePage>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.six, borderRadius: 28, padding: Spacing.four },
  art: { height: 200, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  line: { height: 10, borderRadius: 5 },
  wrong: { flexDirection: 'row', alignItems: 'center', gap: Spacing.six, borderRadius: 28, padding: Spacing.eight },
});
