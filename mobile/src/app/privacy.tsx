import { View } from 'react-native';

import { Container, H3, PageIntro, SitePage } from '@/components/site/frame';
import { T } from '@/components/ui';
import { Spacing } from '@/constants/theme';

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'Your name, email address, the address of each job, photos you add to a request, and messages with your pro. Card details are held by Stripe, our payment provider; we never see your full card number.',
  },
  {
    title: 'Why we use it',
    body: 'To match you with a nearby pro, let them find you, take payment when the job is done, and help if something goes wrong.',
  },
  {
    title: 'Who sees it',
    body: 'Your pro sees what they need for the job: your first name, the job address and the details you shared. Phone numbers and email addresses are hidden in chat on both sides.',
  },
  {
    title: 'Your choices',
    body: 'You can ask us for a copy of your data, or to delete your account, through the Help page.',
  },
];

export default function Privacy() {
  return (
    <SitePage title="Privacy">
      <PageIntro eyebrow="Legal" title="Privacy" sub="What we keep about you, and why. Last updated 28 October 2026." />
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
