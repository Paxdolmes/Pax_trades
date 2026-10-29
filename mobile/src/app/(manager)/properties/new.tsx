import { router } from 'expo-router';
import { House, Plus } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { BackLink, ManagerScreen } from '@/components/landlord';
import { Button, Card, Note, T } from '@/components/ui';
import { Radii, Spacing, Type, usePalette } from '@/constants/theme';
import { useAccountGate } from '@/lib/auth';
import { isLive } from '@/lib/live';
import { addProperty, loadCompanyName, saveCompanyName } from '@/lib/properties';

const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Adds a property. The first time, also asks for the name tenants will see. */
export default function NewProperty() {
  const c = usePalette();
  const signedIn = useAccountGate();
  const [name, setName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [company, setCompany] = useState('');
  const [savedCompany, setSavedCompany] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = name.trim().length > 0 && POSTCODE.test(postcode.trim());

  useEffect(() => {
    if (!isLive) return;
    void loadCompanyName()
      .then((n) => (setSavedCompany(n), setCompany(n)))
      .catch(() => setSavedCompany(''));
  }, []);

  async function save() {
    if (!signedIn()) return;
    if (!isLive) {
      Alert.alert('Demo mode', 'Adding a property needs a Relay account.');
      return;
    }
    setSaving(true);
    try {
      if (company.trim() !== (savedCompany ?? '')) await saveCompanyName(company);
      const id = await addProperty({ name, postcode });
      router.replace({ pathname: '/properties/[id]', params: { id } });
    } catch (e) {
      Alert.alert('Could not add the property', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const input = [Type.body, styles.input, { backgroundColor: c.surface, color: c.ink, borderColor: c.border }];

  return (
    <ManagerScreen>
      <BackLink label="All properties" href="/properties" />
      <View style={{ maxWidth: 560, width: '100%', gap: Spacing.five }}>
        <View style={{ gap: Spacing.two }}>
          <T variant="display" accessibilityRole="header">
            Add a property
          </T>
          <T variant="callout" color="inkMuted">
            {"You'll get a six-character code for your tenant. Relay is in Fulham (SW6) for now."}
          </T>
        </View>
        <Card style={{ gap: Spacing.four }}>
          <Field label="Address">
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Flat 2, 14 Lettice Street" placeholderTextColor={c.inkSubtle} maxLength={120} accessibilityLabel="Address" style={input} />
          </Field>
          <Field label="Postcode">
            <TextInput
              value={postcode}
              onChangeText={(t) => setPostcode(t.toUpperCase())}
              placeholder="SW6 4EH"
              placeholderTextColor={c.inkSubtle}
              autoCapitalize="characters"
              maxLength={8}
              accessibilityLabel="Postcode"
              style={input}
            />
          </Field>
          <Field label="Your name or company, as tenants will see it">
            <TextInput value={company} onChangeText={setCompany} placeholder="e.g. Parsons Green Lettings" placeholderTextColor={c.inkSubtle} maxLength={80} accessibilityLabel="Company name" style={input} />
          </Field>
          <Button label="Add property" icon={Plus} loading={saving} disabled={!ready} onPress={save} />
        </Card>
        <Note icon={House}>{"Free to set up. You only pay for the jobs you approve, at the same prices as everyone else, and you'll need a card saved before your first approval."}</Note>
      </View>
    </ManagerScreen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="subhead" style={{ fontWeight: '600' }}>
        {label}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.four, height: 52 },
});
