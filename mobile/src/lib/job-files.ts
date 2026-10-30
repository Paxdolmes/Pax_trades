// Photos and certificates the pro adds to a job. The customer keeps them with the
// job, and a landlord or agent sees them for their property's jobs. Files go to the
// private job-files bucket, in a folder named after the job.

import { Linking } from 'react-native';

import type { JobFileKind } from '@/domain/paperwork';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type JobFile = {
  id: string;
  kind: JobFileKind;
  contentType: string;
  /** A link that works for an hour; on a demo job, the file on the phone. */
  url: string | null;
};

/** A file as the landlord's history lists it. */
export type JobFileRef = { path: string; kind: JobFileKind; type: string };

export const isPdf = (f: { contentType: string }) => f.contentType === 'application/pdf';

const live = (jobId: string) => isSupabaseConfigured && !jobId.startsWith('demo-') && !jobId.startsWith('example-');

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'application/pdf': 'pdf' };

type Row = { id: string; kind: JobFileKind; storage_path: string; content_type: string };

async function withLinks(rows: Row[]): Promise<JobFile[]> {
  if (!rows.length) return [];
  const { data, error } = await supabase.storage.from('job-files').createSignedUrls(
    rows.map((r) => r.storage_path),
    3600,
  );
  if (error) throw error;
  const links = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ id: r.id, kind: r.kind, contentType: r.content_type, url: links.get(r.storage_path) ?? null }));
}

/** The job's files, certificates first, oldest first within each. */
export async function loadJobFiles(jobId: string): Promise<JobFile[]> {
  if (!live(jobId)) return [];
  const { data, error } = await supabase
    .from('job_files')
    .select('id, kind, storage_path, content_type')
    .eq('job_id', jobId)
    .order('kind', { ascending: false })
    .order('created_at');
  if (error) throw error;
  return withLinks((data ?? []) as Row[]);
}

/** Uploads a photo or certificate the pro picked, and returns it as saved. */
export async function addJobFile(jobId: string, kind: JobFileKind, file: { uri: string; contentType: string }): Promise<JobFile> {
  if (!live(jobId)) return { id: `demo-${Date.now()}`, kind, contentType: file.contentType, url: file.uri };
  const path = `${jobId}/${kind}-${Date.now()}.${EXTENSIONS[file.contentType] ?? 'jpg'}`;
  const body = await (await fetch(file.uri)).arrayBuffer();
  const upload = await supabase.storage.from('job-files').upload(path, body, { contentType: file.contentType });
  if (upload.error) throw upload.error;
  const { data, error } = await supabase
    .from('job_files')
    .insert({ job_id: jobId, kind, storage_path: path, content_type: file.contentType })
    .select('id, kind, storage_path, content_type')
    .single();
  if (error) throw error;
  return (await withLinks([data as Row]))[0];
}

/** Opens one of a landlord's job files from their history. */
export async function openJobFileAt(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from('job-files').createSignedUrl(path, 3600);
  if (error) throw error;
  await Linking.openURL(data.signedUrl);
}
