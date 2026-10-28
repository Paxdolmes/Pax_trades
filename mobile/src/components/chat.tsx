import { router } from 'expo-router';
import { ChevronLeft, SendHorizontal, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, IconButton, T } from '@/components/ui';
import { Layout, Radii, Spacing, Type, usePalette } from '@/constants/theme';
import { DEMO_CHAT, DEMO_CHAT_REPLY } from '@/lib/demo';
import { loadMessages, previewMessage, sendMessage, subscribeMessages, type ChatMessage } from '@/lib/trust';

let localId = 0;
const nextId = () => `local-${++localId}`;
const nowTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/**
 * In-app chat for one job, shared by both apps. Phone numbers and emails are hidden
 * by the database; the sender sees the same masking as they send.
 */
export function ChatScreen({ jobId, me, otherName, subtitle }: { jobId: string; me: 'customer' | 'pro'; otherName: string; subtitle: string }) {
  const c = usePalette();
  const demo = jobId.startsWith('demo-');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    demo ? DEMO_CHAT.map((m, i) => ({ id: `demo-${i}`, mine: m.from === me, body: m.body, at: m.at })) : [],
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    if (demo) return;
    loadMessages(jobId).then(setMessages, () => Alert.alert('Could not load messages'));
    return subscribeMessages(jobId, (m) => setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m])));
  }, [jobId, demo]);

  // Demo: the other side answers the first message you send.
  const replied = useRef(false);
  useEffect(() => {
    if (!demo || replied.current || !messages.at(-1)?.mine) return;
    replied.current = true;
    const t = setTimeout(
      () => setMessages((all) => [...all, { id: nextId(), mine: false, body: DEMO_CHAT_REPLY[me === 'pro' ? 'customer' : 'pro'], at: nowTime() }]),
      1800,
    );
    return () => clearTimeout(t);
  }, [demo, messages, me]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    if (demo) {
      setMessages((all) => [...all, { id: nextId(), mine: true, body: previewMessage(body), at: nowTime() }]);
      return;
    }
    setSending(true);
    try {
      const saved = await sendMessage(jobId, body);
      if (saved) setMessages((all) => (all.some((x) => x.id === saved.id) ? all : [...all, saved]));
    } catch (e) {
      setDraft(body);
      Alert.alert('Message not sent', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <Avatar name={otherName} size={40} />
        <View style={{ flex: 1 }}>
          <T variant="headline">{otherName}</T>
          <T variant="caption" color="inkMuted">
            {subtitle}
          </T>
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.notice, { backgroundColor: c.surfaceMuted }]}>
            <ShieldCheck size={16} color={c.inkMuted} strokeWidth={2.25} />
            <T variant="footnote" color="inkMuted" style={{ flex: 1 }}>
              Phone numbers and emails are hidden. Keep everything in Relay so the job and payment stay covered by the Relay Guarantee.
            </T>
          </View>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubbleRow, { justifyContent: m.mine ? 'flex-end' : 'flex-start' }]}>
              <View
                style={[
                  styles.bubble,
                  m.mine
                    ? { backgroundColor: c.brand, borderBottomRightRadius: Radii.xs }
                    : { backgroundColor: c.surface, borderBottomLeftRadius: Radii.xs },
                ]}>
                <T variant="callout" color={m.mine ? 'onBrand' : 'ink'}>
                  {m.body}
                </T>
                <T variant="caption" color={m.mine ? 'onBrand' : 'inkSubtle'} style={{ alignSelf: 'flex-end', opacity: m.mine ? 0.75 : 1 }}>
                  {m.at}
                </T>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={[styles.composer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            placeholder="Message"
            placeholderTextColor={c.inkSubtle}
            accessibilityLabel={`Message ${otherName}`}
            style={[Type.callout, styles.input, { backgroundColor: c.bg, color: c.ink }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!draft.trim() || sending}
            onPress={send}
            style={[styles.send, { backgroundColor: draft.trim() ? c.brand : c.surfaceMuted }]}>
            <SendHorizontal size={20} color={draft.trim() ? c.onBrand : c.inkSubtle} strokeWidth={2.25} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Layout.gutter, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  list: { padding: Layout.gutter, gap: Spacing.two },
  notice: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radii.md, marginBottom: Spacing.two },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', borderRadius: Radii.lg, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, gap: 2 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, padding: Spacing.three, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: Radii.lg, paddingHorizontal: Spacing.four, paddingTop: 11, paddingBottom: 11 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
