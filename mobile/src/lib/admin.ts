// The admin screen's data: pros to vet and open problem reports. Every function
// here is refused by the database unless the signed-in profile is an admin.

import type { CredentialType, Trade } from '@/domain/catalog';
import { supabase } from '@/lib/supabase';

export type ReviewCredential = {
  id: string;
  type: CredentialType;
  reference: string | null;
  expiresOn: string | null;
  documentPath: string | null;
  verified: boolean;
};

export type ProToReview = {
  id: string;
  name: string;
  email: string | null;
  trades: Trade[];
  appliedAt: string;
  approved: boolean;
  credentials: ReviewCredential[];
};

type ProRow = {
  pro_id: string;
  full_name: string | null;
  email: string | null;
  trades: Trade[];
  applied_at: string;
  approved_at: string | null;
  credentials: { id: string; type: CredentialType; reference: string | null; expires_on: string | null; document_path: string | null; verified: boolean }[];
};

export async function loadProsToReview(): Promise<ProToReview[]> {
  const { data, error } = await supabase.rpc('admin_pros_to_review');
  if (error) throw error;
  return ((data ?? []) as ProRow[]).map((r) => ({
    id: r.pro_id,
    name: r.full_name ?? 'No name',
    email: r.email,
    trades: r.trades,
    appliedAt: r.applied_at,
    approved: Boolean(r.approved_at),
    credentials: r.credentials.map((c) => ({
      id: c.id,
      type: c.type,
      reference: c.reference,
      expiresOn: c.expires_on,
      documentPath: c.document_path,
      verified: c.verified,
    })),
  }));
}

export async function checkCredential(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_check_credential', { p_credential: id, p_accept: accept });
  if (error) throw error;
}

export async function approvePro(id: string, founding: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_pro', { p_pro: id, p_founding: founding });
  if (error) throw error;
}

export type ProblemStatus = 'open' | 'pro_returning' | 'refunded' | 'credited' | 'closed';

export type OpenReport = {
  id: string;
  jobId: string;
  kind: string;
  status: ProblemStatus;
  description: string;
  createdAt: string;
  jobLabel: string;
  postcode: string;
  customerName: string;
  proName: string;
  paidPence: number | null;
};

type ReportRow = {
  report_id: string;
  job_id: string;
  kind: string;
  status: ProblemStatus;
  description: string;
  created_at: string;
  job_label: string;
  postcode: string;
  customer_name: string | null;
  pro_name: string | null;
  paid_pence: number | null;
};

export async function loadOpenReports(): Promise<OpenReport[]> {
  const { data, error } = await supabase.rpc('admin_open_reports');
  if (error) throw error;
  return ((data ?? []) as ReportRow[]).map((r) => ({
    id: r.report_id,
    jobId: r.job_id,
    kind: r.kind,
    status: r.status,
    description: r.description,
    createdAt: r.created_at,
    jobLabel: r.job_label,
    postcode: r.postcode,
    customerName: r.customer_name ?? 'Customer',
    proName: r.pro_name ?? 'No pro',
    paidPence: r.paid_pence,
  }));
}

export async function resolveReport(id: string, status: Exclude<ProblemStatus, 'open'>, note: string, creditPence = 0): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_report', {
    p_report: id,
    p_status: status,
    p_note: note,
    p_credit_pence: creditPence,
  });
  if (error) throw error;
}

export type FunnelStep = { step: string; people: number };

/** How many people reached each step, from signing up to a completed job, in the last `days`. */
export async function loadFunnel(days = 30): Promise<FunnelStep[]> {
  const { data, error } = await supabase.rpc('admin_funnel', { p_days: days });
  if (error) throw error;
  return ((data ?? []) as { step: string; people: number }[]).map((r) => ({ step: r.step, people: Number(r.people) }));
}
