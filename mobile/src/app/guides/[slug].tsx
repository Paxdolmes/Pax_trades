import { Redirect, useLocalSearchParams } from 'expo-router';

import { GuidePage } from '@/components/site/guide-page';
import { GUIDES } from '@/content/guides';

export default function Guide() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = GUIDES.find((g) => g.slug === slug);
  return guide ? <GuidePage guide={guide} /> : <Redirect href="/guides" />;
}
