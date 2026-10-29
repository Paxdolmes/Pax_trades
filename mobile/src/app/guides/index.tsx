import { View } from 'react-native';

import { Container, PageIntro, SitePage } from '@/components/site/frame';
import { GuideList } from '@/components/site/guide-page';
import { CtaBand } from '@/components/site/widgets';

export default function Guides() {
  return (
    <SitePage title="Guides">
      <PageIntro
        eyebrow="Guides"
        title="Home repair guides"
        sub="Plain-English help for when something goes wrong at home: what to check first, what to do right now, and what it should cost."
      />
      <Container style={{ paddingBottom: 88 }}>
        <View style={{ maxWidth: 760 }}>
          <GuideList />
        </View>
      </Container>
      <CtaBand />
    </SitePage>
  );
}
