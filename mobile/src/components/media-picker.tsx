import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, Play, X } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { PILOT } from '@/domain/catalog';
import { mediaProblem } from '@/domain/rules';
import type { PickedMedia } from '@/lib/media';

const TILE = 88;

/** Up to 3 photos or one short video, shown as a row of thumbnails with an add button. */
export function MediaPicker({ value, onChange }: { value: PickedMedia[]; onChange: (next: PickedMedia[]) => void }) {
  const c = usePalette();
  const full = value.length >= PILOT.maxPhotos || value.some((m) => m.kind === 'video');

  function add(assets: ImagePicker.ImagePickerAsset[]) {
    let next = value;
    for (const a of assets) {
      const item: PickedMedia =
        a.type === 'video'
          ? { kind: 'video', uri: a.uri, seconds: (a.duration ?? 0) / 1000, mimeType: a.mimeType ?? undefined }
          : { kind: 'photo', uri: a.uri, mimeType: a.mimeType ?? undefined };
      const problem = mediaProblem(next, item);
      if (problem) {
        Alert.alert(problem);
        break;
      }
      next = [...next, item];
    }
    onChange(next);
  }

  async function pick(source: 'library' | 'camera') {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: value.length ? ['images'] : ['images', 'videos'],
      allowsMultipleSelection: source === 'library',
      selectionLimit: PILOT.maxPhotos - value.length,
      videoMaxDuration: PILOT.maxVideoSeconds,
      quality: 0.7,
    };
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera access is off', 'You can turn it on in Settings, or choose a photo from your library instead.');
        return;
      }
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) add(result.assets);
  }

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.row}>
        {value.map((m, i) => (
          <View key={m.uri} style={[styles.tile, { backgroundColor: c.surfaceMuted }]}>
            {m.kind === 'photo' ? (
              <Image source={{ uri: m.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Photo ${i + 1}`} />
            ) : (
              <View style={styles.video} accessibilityLabel={`Video, ${Math.round(m.seconds ?? 0)} seconds`}>
                <Play size={24} color={c.ink} fill={c.ink} />
                <T variant="caption" style={{ fontWeight: '600' }}>{`0:${String(Math.round(m.seconds ?? 0)).padStart(2, '0')}`}</T>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${m.kind} ${i + 1}`}
              hitSlop={8}
              onPress={() => onChange(value.filter((x) => x !== m))}
              style={[styles.remove, { backgroundColor: c.ink }]}>
              <X size={14} color={c.surface} strokeWidth={3} />
            </Pressable>
          </View>
        ))}
        {full ? null : (
          <>
            <AddTile icon={ImagePlus} label="Add" onPress={() => pick('library')} />
            <AddTile icon={Camera} label="Camera" onPress={() => pick('camera')} />
          </>
        )}
      </View>
      <T variant="footnote" color="inkSubtle">
        {`Up to ${PILOT.maxPhotos} photos, or one video of ${PILOT.maxVideoSeconds} seconds or less.`}
      </T>
    </View>
  );
}

function AddTile({ icon: Icon, label, onPress }: { icon: typeof Camera; label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === 'Add' ? 'Add photos or a video' : 'Take a photo or video'}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, styles.add, { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}>
      <Icon size={24} color={c.brand} strokeWidth={2.1} />
      <T variant="caption" color="brand" style={{ fontWeight: '600' }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: TILE, height: TILE, borderRadius: Radii.sm, overflow: 'hidden' },
  add: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  video: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  remove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
