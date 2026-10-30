import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronRight, CircleCheck, FileBadge, FileText, ImagePlus, Images, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Card, Divider, IconTile, SectionLabel, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { certificateName, JOB_FILE_LIMITS, jobFileType, type JobFileKind, type Paperwork } from '@/domain/paperwork';
import { addJobFile, isPdf, openJobFileAt, type JobFile, type JobFileRef } from '@/lib/job-files';

const TILE = 72;

type Picked = { uri: string; mimeType?: string | null; name?: string | null };

const open = (url: string | null) => (url ? void Linking.openURL(url) : undefined);

const showExample = () => Alert.alert('Example', 'On a real job, this opens what the pro uploaded.');

/**
 * The pro's after-photos and certificate, uploaded as soon as they're added. The
 * screen keeps `files`, so it knows when a required certificate is in.
 */
export function JobFilesEditor({
  jobId,
  paperwork,
  files,
  onAdded,
}: {
  jobId: string;
  paperwork: Paperwork | null;
  files: JobFile[];
  onAdded: (file: JobFile) => void;
}) {
  const c = usePalette();
  const [busy, setBusy] = useState<JobFileKind | null>(null);
  const photos = files.filter((f) => f.kind === 'photo');
  const certificates = files.filter((f) => f.kind === 'certificate');
  const photosFull = photos.length >= JOB_FILE_LIMITS.photo;
  const certificatesFull = certificates.length >= JOB_FILE_LIMITS.certificate;
  const done = certificates.length > 0;

  async function upload(kind: JobFileKind, picked: Picked[]) {
    setBusy(kind);
    try {
      for (const p of picked) {
        const contentType = jobFileType(p.mimeType, p.name ?? p.uri);
        if (!contentType || (kind === 'photo' && contentType === 'application/pdf')) {
          Alert.alert(kind === 'photo' ? 'Choose a photo' : 'Choose a PDF or a photo', 'Relay takes JPEG, PNG and HEIC photos, and PDFs for certificates.');
          return;
        }
        onAdded(await addJobFile(jobId, kind, { uri: p.uri, contentType }));
      }
    } catch (e) {
      Alert.alert('Could not upload', e instanceof Error ? e.message : 'Please check your signal and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function pickPhoto(kind: JobFileKind, source: 'library' | 'camera') {
    const room = JOB_FILE_LIMITS[kind] - (kind === 'photo' ? photos : certificates).length;
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera access is off', 'You can turn it on in Settings, or choose a photo from your library instead.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: source === 'library', selectionLimit: room };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) await upload(kind, result.assets.slice(0, room).map((a) => ({ uri: a.uri, mimeType: a.mimeType, name: a.fileName })));
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'], copyToCacheDirectory: true });
    if (!result.canceled) await upload('certificate', result.assets.slice(0, 1).map((a) => ({ uri: a.uri, mimeType: a.mimeType, name: a.name })));
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <SectionLabel
        right={
          <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
            Kept for the customer
          </T>
        }>
        {paperwork ? 'Photos and certificate' : 'Photos'}
      </SectionLabel>
      <View style={styles.row}>
        {photos.map((p, i) => (
          <Thumb key={p.id} file={p} label={`Photo ${i + 1}`} />
        ))}
        {busy === 'photo' ? (
          <View style={[styles.tile, styles.centered, { backgroundColor: c.surfaceMuted }]}>
            <ActivityIndicator color={c.brand} />
          </View>
        ) : photosFull ? null : (
          <>
            <AddTile icon={ImagePlus} label="Add photo" onPress={() => void pickPhoto('photo', 'library')} />
            <AddTile icon={Camera} label="Camera" onPress={() => void pickPhoto('photo', 'camera')} />
          </>
        )}
      </View>
      {paperwork ? (
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={done ? `${paperwork.label} uploaded. Add another page` : `Upload ${paperwork.label}`}
            disabled={certificatesFull || busy !== null}
            onPress={() => void pickDocument()}
            style={[
              styles.certificate,
              done ? { borderColor: c.success, backgroundColor: c.successTint, borderStyle: 'solid' } : { borderColor: c.brand, backgroundColor: c.brandTint },
            ]}>
            <FileBadge size={24} color={done ? c.success : c.brand} strokeWidth={2.25} />
            <View style={{ flex: 1 }}>
              <T variant="subhead" color={done ? 'successStrong' : 'brand'} style={{ fontWeight: '600' }}>
                {paperwork.label}
              </T>
              <T variant="caption" color={done ? 'successStrong' : 'brand'} style={{ fontSize: 12, fontWeight: '500' }}>
                {busy === 'certificate'
                  ? 'Uploading…'
                  : done
                    ? certificates.length === 1
                      ? 'Uploaded'
                      : `${certificates.length} pages uploaded`
                    : paperwork.required
                      ? 'Required to complete · PDF or photo'
                      : 'Optional · PDF or photo'}
              </T>
            </View>
            {busy === 'certificate' ? (
              <ActivityIndicator color={c.brand} />
            ) : done ? (
              <CircleCheck size={18} color={c.success} />
            ) : (
              <Upload size={18} color={c.brand} strokeWidth={2.5} />
            )}
          </Pressable>
          {certificatesFull || busy !== null ? null : (
            <AddTile icon={Camera} label={done ? 'Add page' : 'Photo'} onPress={() => void pickPhoto('certificate', 'camera')} />
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * What the pro left, kept with the job: each certificate to open, then the photos.
 * Example jobs show what it looks like, without real files.
 */
export function JobFilesView({
  files,
  paperwork,
  proName,
  certificateNote,
  example,
}: {
  files: JobFile[];
  paperwork: Paperwork | null;
  proName: string;
  /** Under the first certificate, e.g. the engineer's Gas Safe number. */
  certificateNote?: string;
  example?: boolean;
}) {
  const c = usePalette();
  const certificates = files.filter((f) => f.kind === 'certificate');
  const photos = files.filter((f) => f.kind === 'photo');
  const shownCertificates = example && !certificates.length && paperwork ? [null] : certificates;
  const shownPhotos = example && !photos.length ? [null, null] : photos;
  const label = paperwork?.label ?? 'Certificate';
  return (
    <>
      {shownCertificates.length ? (
        <Card style={{ padding: 0 }}>
          {shownCertificates.map((f, i) => (
            <View key={f?.id ?? i}>
              {i > 0 ? <Divider inset={68} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${certificateName(label, i)}`}
                onPress={f ? () => open(f.url) : showExample}
                style={({ pressed }) => [styles.fileRow, pressed && { opacity: 0.7 }]}>
                <IconTile icon={FileText} tone="success" size={40} />
                <View style={{ flex: 1 }}>
                  <T variant="subhead">{certificateName(label, i)}</T>
                  <T variant="footnote" color="inkMuted">
                    {[i === 0 ? certificateNote : null, f && !isPdf(f) ? 'Photo' : 'PDF'].filter(Boolean).join(' · ')}
                  </T>
                </View>
                <ChevronRight size={18} color={c.inkSubtle} strokeWidth={2.25} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
      {shownPhotos.length ? (
        <Card style={{ gap: Spacing.three }}>
          <View style={styles.header}>
            <IconTile icon={Images} size={40} />
            <T variant="headline" style={{ flex: 1 }}>
              {`Photos from ${proName}`}
            </T>
          </View>
          <View style={styles.row}>
            {shownPhotos.map((p, i) =>
              p ? <Thumb key={p.id} file={p} label={`Photo ${i + 1} from ${proName}`} /> : <ExamplePhoto key={i} label={i === 0 ? 'Before' : 'After'} after={i > 0} />,
            )}
          </View>
        </Card>
      ) : null}
    </>
  );
}

/** A landlord's history row: one link per certificate and photo the pro added. */
export function JobFileLinks({ files, paperwork, example }: { files: JobFileRef[]; paperwork: Paperwork | null; example?: boolean }) {
  const c = usePalette();
  let certificate = 0;
  let photo = 0;
  return (
    <View style={styles.links}>
      {files.map((f) => {
        const name = f.kind === 'certificate' ? certificateName(paperwork?.label ?? 'Certificate', certificate++) : `Photo ${++photo}`;
        const Icon = f.kind === 'certificate' ? FileText : Images;
        return (
          <Pressable
            key={f.path}
            accessibilityRole="link"
            accessibilityLabel={`Open ${name}`}
            onPress={
              example
                ? showExample
                : () => void openJobFileAt(f.path).catch((e: unknown) => Alert.alert('Could not open it', e instanceof Error ? e.message : 'Please try again.'))
            }
            style={({ pressed }) => [styles.link, { backgroundColor: c.accentTint }, pressed && { opacity: 0.7 }]}>
            <Icon size={14} color={c.accentStrong} strokeWidth={2.25} />
            <T variant="caption" color="accentStrong" style={{ fontWeight: '600' }}>
              {name}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Thumb({ file, label }: { file: JobFile; label: string }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={`${label}. Open it`}
      onPress={() => open(file.url)}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.surfaceMuted }, pressed && { opacity: 0.7 }]}>
      {file.url && !isPdf(file) ? (
        <Image source={{ uri: file.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.center}>
          <FileText size={24} color={c.inkMuted} strokeWidth={2.1} />
        </View>
      )}
    </Pressable>
  );
}

/** An example job's photo: a boiler, before and after. */
function ExamplePhoto({ label, after }: { label: string; after?: boolean }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={`Example ${label.toLowerCase()} photo`}
      onPress={showExample}
      style={[styles.tile, styles.centered, { backgroundColor: after ? c.accentTint : c.surfaceMuted }]}>
      <View style={[styles.boiler, { backgroundColor: c.surface }]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: after ? c.accent : c.inkSubtle }} />
        <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: c.border }} />
      </View>
      <T variant="caption" color="inkMuted" style={styles.photoLabel}>
        {label}
      </T>
    </Pressable>
  );
}

function AddTile({ icon: Icon, label, onPress }: { icon: typeof Camera; label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === 'Camera' || label === 'Photo' || label === 'Add page' ? `${label}: take a photo` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, styles.add, { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}>
      <Icon size={22} color={c.brand} strokeWidth={2.1} />
      <T variant="caption" color="brand" style={{ fontSize: 11, fontWeight: '600' }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  tile: { width: TILE, height: TILE, borderRadius: Radii.md, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  add: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  certificate: { flex: 1, minHeight: TILE, borderRadius: Radii.md, borderWidth: 1.5, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  boiler: { width: 30, height: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoLabel: { position: 'absolute', left: 8, bottom: 6, fontSize: 11 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
