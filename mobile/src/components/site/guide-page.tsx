// A guide (src/content/guides.ts): a safety warning if there is one, the sections
// with their steps and points, official sources, then where to book and other guides.
import { ArrowUpRight, Check, TriangleAlert } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { GUIDES, type Guide, type GuideSection } from '@/content/guides';
import { LOCAL_PAGES } from '@/content/local';
import { WAITLIST } from '@/lib/launch';

import { ArrowLink, Container, H2, H3, isHovered, isWeb, Lead, MAIN_CTA, PageIntro, Pill, SitePage, SoftCard, useBreakpoint } from './frame';
import { CtaBand } from './widgets';

export function GuidePage({ guide }: { guide: Guide }) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const trade = LOCAL_PAGES.find((p) => p.path === guide.related)!;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  return (
    <SitePage title="Guides">
      <PageIntro eyebrow="Guide" title={guide.title} sub={guide.sub} />
      <Container style={{ paddingBottom: narrow ? 56 : 88 }}>
        <View style={{ maxWidth: 760, gap: narrow ? Spacing.eight : Spacing.ten }}>
          {guide.warning ? (
            <View style={[styles.warning, { backgroundColor: c.urgentTint }]}>
              <TriangleAlert size={22} color={c.urgent} strokeWidth={2.2} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: Spacing.one }}>
                <T variant="headline" color="urgent">
                  {guide.warning.title}
                </T>
                <T variant="body">{guide.warning.text}</T>
              </View>
            </View>
          ) : null}
          {guide.sections.map((s) => (
            <Section key={s.heading} section={s} />
          ))}
          <SoftCard style={{ gap: Spacing.four }}>
            <H3>{`Need a ${trade.name.replace(' in Fulham', '').toLowerCase()} in Fulham?`}</H3>
            <T variant="body" color="inkMuted">
              {WAITLIST
                ? 'Relay opens soon in Fulham, SW6. Join the waiting list and we’ll tell you the day you can book, or see how booking will work.'
                : 'Book a vetted local pro in two minutes, with the price shown first.'}
            </T>
            <View style={styles.ctas}>
              <Pill label={MAIN_CTA.label} variant={WAITLIST ? 'teal' : 'primary'} href={WAITLIST ? { pathname: '/waitlist', params: { trade: guide.trade } } : MAIN_CTA.href} />
              <Pill label={WAITLIST ? 'See how booking will work' : 'See prices'} variant="secondary" href={WAITLIST ? { pathname: '/home', params: { trade: guide.trade, job: guide.job } } : '/prices'} />
            </View>
            <ArrowLink label={trade.name} href={trade.path} />
          </SoftCard>
          <View style={{ gap: Spacing.four }}>
            <H2 style={{ fontSize: 24, lineHeight: 30 }}>More guides</H2>
            <View style={{ gap: Spacing.two }}>
              {others.map((g) => (
                <ArrowLink key={g.slug} label={g.title} href={g.path} />
              ))}
            </View>
          </View>
        </View>
      </Container>
      <CtaBand />
    </SitePage>
  );
}

function Section({ section }: { section: GuideSection }) {
  const c = usePalette();
  return (
    <View style={{ gap: Spacing.four }}>
      <H2 style={{ fontSize: 28, lineHeight: 34 }}>{section.heading}</H2>
      {section.paragraphs?.map((p) => (
        <Lead key={p}>{p}</Lead>
      ))}
      {section.steps ? (
        <View role="list" style={{ gap: Spacing.five }}>
          {section.steps.map((step, i) => (
            <View key={step.title} role="listitem" style={{ flexDirection: 'row', gap: Spacing.four, alignItems: 'flex-start' }}>
              <View style={[styles.stepNo, { backgroundColor: c.accent }]}>
                <T variant="headline" color="onAccent">
                  {String(i + 1)}
                </T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <H3>{step.title}</H3>
                <T variant="body" color="inkMuted">
                  {step.text}
                </T>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {section.points ? (
        <View role="list" style={{ gap: Spacing.three }}>
          {section.points.map((p) => (
            <View key={p} role="listitem" style={{ flexDirection: 'row', gap: Spacing.three }}>
              <Check size={18} color={c.accentStrong} strokeWidth={2.6} style={{ marginTop: 4 }} />
              <T variant="body" color="inkMuted" style={{ flex: 1, fontSize: 17, lineHeight: 26 }}>
                {p}
              </T>
            </View>
          ))}
        </View>
      ) : null}
      {section.link ? <ArrowLink label={section.link.label} href={section.link.href} /> : null}
      {section.sources?.map((s) => (
        <SourceLink key={s.url} {...s} />
      ))}
    </View>
  );
}

/** A link to an official site, in a new tab on the web. */
function SourceLink({ label, url }: { label: string; url: string }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="link"
      {...(isWeb ? { href: url, hrefAttrs: { target: '_blank', rel: 'noopener' } } : { onPress: () => Linking.openURL(url) })}
      style={(state) => [styles.source, isHovered(state) && { opacity: 0.75 }]}>
      <T variant="bodyStrong" color="accentStrong" style={{ fontWeight: '700', fontSize: 15 }}>
        {label}
      </T>
      <ArrowUpRight size={16} color={c.accentStrong} strokeWidth={2.4} />
    </Pressable>
  );
}

/** Every guide, as cards, for /guides. */
export function GuideList() {
  return (
    <View style={{ gap: Spacing.four }}>
      {GUIDES.map((g) => (
        <SoftCard key={g.slug} style={{ gap: Spacing.two }}>
          <H3>{g.title}</H3>
          <T variant="body" color="inkMuted">
            {g.summary}
          </T>
          <View style={{ marginTop: Spacing.one }}>
            <ArrowLink label="Read the guide" href={g.path} />
          </View>
        </SoftCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  warning: { flexDirection: 'row', gap: Spacing.three, borderRadius: Radii.lg, padding: Spacing.five },
  stepNo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ctas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
});
