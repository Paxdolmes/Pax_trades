// Photos and short videos customers attach to a request or a problem report.

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Media } from '@/domain/rules';

export type PickedMedia = Media & { uri: string; mimeType?: string };

export type MediaTarget = { jobId: string } | { quoteRequestId: string } | { problemReportId: string };

function targetColumns(t: MediaTarget) {
  if ('jobId' in t) return { job_id: t.jobId };
  if ('quoteRequestId' in t) return { quote_request_id: t.quoteRequestId };
  return { problem_report_id: t.problemReportId };
}

function targetId(t: MediaTarget): string {
  return 'jobId' in t ? t.jobId : 'quoteRequestId' in t ? t.quoteRequestId : t.problemReportId;
}

/**
 * Uploads each item to the private request-media bucket, under the user's own
 * folder, and records it against the request. Does nothing in demo mode.
 */
export async function uploadMedia(target: MediaTarget, items: PickedMedia[]): Promise<void> {
  if (!items.length || !isSupabaseConfigured || targetId(target).startsWith('demo-')) return;
  const { data } = await supabase.auth.getSession();
  const me = data.session?.user.id;
  if (!me) throw new Error('Please sign in again');

  for (const [i, item] of items.entries()) {
    const ext = item.kind === 'video' ? 'mp4' : 'jpg';
    const path = `${me}/${targetId(target)}-${i}.${ext}`;
    const body = await (await fetch(item.uri)).arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('request-media')
      .upload(path, body, { contentType: item.mimeType ?? (item.kind === 'video' ? 'video/mp4' : 'image/jpeg'), upsert: true });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from('request_media').insert({
      ...targetColumns(target),
      kind: item.kind,
      storage_path: path,
      duration_seconds: item.kind === 'video' ? Math.max(1, Math.round(item.seconds ?? 1)) : null,
    });
    if (error) throw error;
  }
}
