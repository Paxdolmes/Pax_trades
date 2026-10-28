import { View } from 'react-native';

import { Container, H3, PageIntro, SitePage } from '@/components/site/frame';
import { T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PILOT } from '@/domain/catalog';

const SECTIONS = [
  {
    title: 'What Relay does',
    body: 'Relay connects you with independent, vetted tradespeople in your area. The tradesperson does the work; Relay handles booking, payment and support, and stands behind the job with the Relay Guarantee.',
  },
  {
    title: 'Prices and payment',
    body: 'You see the price before you book, including VAT and fees. We hold the amount on your card when you book and only take payment once you confirm the job is done. Extra work or parts need your approval in the app first.',
  },
  {
    title: 'Cancelling',
    body: 'You can cancel any time before your pro arrives, from the job screen.',
  },
  {
    title: 'The Relay Guarantee',
    body: `If something isn’t right, report it within ${PILOT.guaranteeDays} days of the job. We’ll look into it and put it right, which might mean sending a pro back, a refund, or paying for repairs.`,
  },
  {
    title: 'During the pilot',
    body: 'Relay is in an early pilot in Fulham (SW6). We may change these terms as we grow and will tell you before any change affects a booking you have made.',
  },
];

export default function Terms() {
  return (
    <SitePage title="Terms">
      <PageIntro eyebrow="Legal" title="Terms of use" sub="The short version of how booking with Relay works. Last updated 28 October 2026." />
      <Container style={{ gap: Spacing.six, paddingBottom: 88, maxWidth: 820 }}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={{ gap: Spacing.two }}>
            <H3>{s.title}</H3>
            <T variant="body" color="inkMuted">
              {s.body}
            </T>
          </View>
        ))}
      </Container>
    </SitePage>
  );
}
