// Pros' documents: Gas Safe registration, scheme membership, NVQs and insurance.
// The file goes to the private credential-docs bucket, under the pro's own folder.

import type { CredentialType } from '@/domain/catalog';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type NewCredential = { type: CredentialType; reference: string; expiresOn: string | null; uri: string; mimeType: string };

export async function addCredential(doc: NewCredential): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data } = await supabase.auth.getSession();
  const me = data.session?.user.id;
  if (!me) throw new Error('Please sign in again');
  const ext = doc.mimeType === 'application/pdf' ? 'pdf' : doc.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${me}/${doc.type}-${Date.now()}.${ext}`;
  const body = await (await fetch(doc.uri)).arrayBuffer();
  const upload = await supabase.storage.from('credential-docs').upload(path, body, { contentType: doc.mimeType });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from('credentials').insert({
    pro_id: me,
    type: doc.type,
    reference: doc.reference,
    expires_on: doc.expiresOn,
    document_path: path,
  });
  if (error) throw error;
}

/** A short-lived link to a document, for the admin screen. */
export async function documentLink(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('credential-docs').createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
