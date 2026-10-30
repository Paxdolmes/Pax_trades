// What a pro leaves with the customer: after-photos and, for some jobs, a
// certificate. The job_files table in the database keeps the same limits.
// Kept free of React Native imports so it runs under `node --test`.

import type { JobType } from './catalog.ts';

export type JobFileKind = 'photo' | 'certificate';

/** A photo of each page of a paper certificate counts as one file. */
export const JOB_FILE_LIMITS: Record<JobFileKind, number> = { photo: 6, certificate: 4 };

export type Paperwork = { label: string; required: boolean };

/**
 * The certificate a job leaves, if any. Gas work needs one before the job can be
 * completed, and so does an EICR, which is the report itself. Electricians can add
 * one to any other job.
 */
export function paperworkFor(job: Pick<JobType, 'id' | 'trade'>): Paperwork | null {
  if (job.id === 'cp12' || job.id === 'boiler-service-cp12') return { label: 'Gas safety record (CP12)', required: true };
  if (job.id === 'boiler-service') return { label: 'Boiler service record', required: true };
  if (job.trade === 'heating') return { label: 'Gas safety or repair report', required: true };
  if (job.id === 'eicr-small') return { label: 'EICR report', required: true };
  if (job.trade === 'electrical') return { label: 'Electrical certificate', required: false };
  return null;
}

const TYPES: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/heic': 'image/heic',
  'application/pdf': 'application/pdf',
};

const EXTENSIONS: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', pdf: 'application/pdf' };

/** The file's type as the bucket stores it: JPEG, PNG, HEIC or PDF. Null for anything else. */
export function jobFileType(mimeType: string | null | undefined, name: string | null | undefined): string | null {
  const type = TYPES[(mimeType ?? '').toLowerCase()];
  if (type) return type;
  if (mimeType) return null;
  const ext = (name ?? '').split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
  return EXTENSIONS[ext] ?? null;
}

/** "Gas safety record (CP12)", then "…, page 2" for each page after the first. */
export function certificateName(label: string, index: number): string {
  return index === 0 ? label : `${label}, page ${index + 1}`;
}
