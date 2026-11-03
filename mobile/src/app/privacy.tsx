import { View } from 'react-native';

import { Container, H3, PageIntro, SitePage } from '@/components/site/frame';
import { T } from '@/components/ui';
import { Spacing } from '@/constants/theme';

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'Your name, email address, the address of each job, photos you add to a request, and messages with your pro. Card details are held by Stripe, our payment provider; we never see your full card number. If you work with us as a tradesperson, we also keep the documents you upload for vetting, and your location while you are online in Relay Traders.',
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
    body: 'You can delete your account at any time in the app, under Account (Profile in Relay Traders). This deletes your details and documents; records of finished jobs and payments are kept without your name, as the law requires. You can also ask us for a copy of your data through the Help page.',
  },
];

export default function Privacy() {
  return (
    <SitePage title="Privacy">
      <PageIntro eyebrow="Legal" title="Privacy" sub="What we keep about you, and why. Last updated 3 November 2026." />
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
