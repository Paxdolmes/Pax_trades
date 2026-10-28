import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronLeft, ImagePlus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Footer, IconButton, Note, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import type { CredentialType } from '@/domain/catalog';
import { parseUkDate } from '@/domain/rules';
import { addCredential } from '@/lib/credentials';
import { CREDENTIAL_LABELS } from '@/lib/demo';
import { usePro } from '@/lib/pro';

const TYPES = Object.keys(CREDENTIAL_LABELS) as CredentialType[];

/** What to type in the reference box for each document. */
const REFERENCE_HINT: Record<CredentialType, string> = {
  gas_safe: 'Gas Safe licence number, 6 or 7 digits',
  competent_person_scheme: 'NICEIC, NAPIT or ELECSA membership number',
  plumbing_nvq: 'Certificate number',
  unvented_g3: 'Certificate number',
  public_liability: 'Policy number',
};

/** NVQs and G3 certificates don't expire. */
const NEVER_EXPIRES: CredentialType[] = ['plumbing_nvq'];

/** A pro adds a document: what it is, its number, its expiry date and a photo. The Relay team checks it. */
export default function AddDocument() {
  const c = usePalette();
  const params = useLocalSearchParams<{ type?: CredentialType }>();
  const { reload } = usePro();
  const [type, setType] = useState<CredentialType>(params.type && TYPES.includes(params.type) ? params.type : 'public_liability');
  const [reference, setReference] = useState('');
  const [expiry, setExpiry] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const needsExpiry = !NEVER_EXPIRES.includes(type);
  const expiresOn = needsExpiry ? parseUkDate(expiry) : null;
  const ready = reference.trim().length >= 3 && photo !== null && (!needsExpiry || expiresOn !== null);

  async function pick(source: 'camera' | 'library') {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return Alert.alert('Camera access is off', 'Turn it on in Settings to photograph your document.');
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
  }

  async function save() {
    if (!photo) return;
    setSaving(true);
    try {
      await addCredential({ type, reference: reference.trim(), expiresOn, uri: photo.uri, mimeType: photo.mimeType ?? 'image/jpeg' });
      await reload();
      Alert.alert('Thanks, we have it', 'The Relay team checks documents within a day. We’ll let you know.');
      router.back();
    } catch (e) {
      Alert.alert('Could not upload', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      background="surface"
      footer={
        <Footer>
          <Button label="Send for checking" loading={saving} disabled={!ready} onPress={save} />
        </Footer>
      }>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} tone="muted" />
        <T variant="headline">Add a document</T>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ gap: Spacing.two }}>
        <T variant="headline">Which document?</T>
        <View style={styles.chips}>
          {TYPES.map((t) => {
            const on = t === type;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setType(t)}
                style={[styles.chip, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandTint : c.surface }]}>
                <T variant="subhead" color={on ? 'brand' : 'ink'} style={{ fontWeight: '600' }}>
                  {CREDENTIAL_LABELS[t]}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: Spacing.two }}>
        <T variant="headline">Number</T>
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder={REFERENCE_HINT[type]}
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel={REFERENCE_HINT[type]}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[Type.body, styles.input, Shadows.card, { backgroundColor: c.surface, color: c.ink, borderColor: c.border }]}
        />
      </View>

      {needsExpiry ? (
        <View style={{ gap: Spacing.two }}>
          <T variant="headline">Expiry date</T>
          <TextInput
            value={expiry}
            onChangeText={setExpiry}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={c.inkSubtle}
            accessibilityLabel="Expiry date, day month year"
            keyboardType="numbers-and-punctuation"
            style={[Type.body, styles.input, Shadows.card, { backgroundColor: c.surface, color: c.ink, borderColor: c.border }]}
          />
          {expiry.length >= 8 && !expiresOn ? (
            <T variant="footnote" color="danger">
              Enter a date in the future, like 31/01/2027.
            </T>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <T variant="headline">Photo of the document</T>
        {photo ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Change the photo" onPress={() => pick('library')}>
            <Image source={{ uri: photo.uri }} style={[styles.preview, { backgroundColor: c.surfaceMuted }]} contentFit="cover" />
          </Pressable>
        ) : (
          <View style={styles.chips}>
            <Button label="Take a photo" icon={Camera} variant="outline" size="md" onPress={() => pick('camera')} style={{ flex: 1 }} />
            <Button label="Choose" icon={ImagePlus} variant="outline" size="md" onPress={() => pick('library')} style={{ flex: 1 }} />
          </View>
        )}
        <Note icon={ImagePlus}>Make sure the name, number and dates are readable.</Note>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 2, borderRadius: Radii.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  input: { height: 56, borderRadius: Radii.md, borderWidth: 1, paddingHorizontal: Spacing.four },
  preview: { width: '100%', height: 200, borderRadius: Radii.md },
});
