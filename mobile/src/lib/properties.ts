// Landlords and letting agents: the database functions in
// 20261029100000_landlords.sql. A manager adds properties and gives each tenant
// the property's join code. A tenant's requests wait for the manager's OK, and the
// bill goes to the manager's card.

import { Platform, Share } from 'react-native';

import { DEMO_QUOTES } from '@/lib/demo';
import type { JobFileRef } from '@/lib/job-files';
import type { JobStatus, Urgency } from '@/lib/jobs';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Approval = 'pending' | 'approved' | 'declined';

/** The tenant's home, as they see it. */
export type MyProperty = { id: string; name: string; postcode: string; managerName: string; autoApproveUrgent: boolean };

export type ManagedProperty = {
  id: string;
  name: string;
  postcode: string;
  joinCode: string;
  autoApproveUrgent: boolean;
  tenants: string[];
  pending: number;
  openJobs: number;
  jobs: number;
  spendPence: number;
  spendYearPence: number;
  lastJobAt: string | null;
};

export type ManagedJob = {
  jobId: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  bookedByManager: boolean;
  jobTypeId: string;
  urgency: Urgency;
  status: JobStatus;
  approval: Approval | null;
  description: string;
  createdAt: string;
  scheduledFor: string | null;
  finishedAt: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  finalPricePence: number | null;
  proName: string | null;
  declineReason: string | null;
  /** The pro's photos and certificates, certificates first. */
  files: JobFileRef[];
};

/** A "Get quotes" request for one of the manager's properties. The manager accepts a quote. */
export type ManagedQuoteRequest = {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  requestedByManager: boolean;
  description: string;
  status: 'open' | 'accepted' | 'cancelled' | 'expired';
  createdAt: string;
  quotes: number;
  lowestPence: number | null;
};

export type Tenant = { id: string; name: string; joinedAt: string };

/** Ids of the example dashboard start with this, like demo jobs start with "demo-". */
export const EXAMPLE_PREFIX = 'example-';
export const isExample = (id: string | undefined) => Boolean(id?.startsWith(EXAMPLE_PREFIX));

/** Waiting for the manager: shown first on the dashboard. */
export const isAwaiting = (j: ManagedJob) => j.approval === 'pending' && j.status === 'requested';

/** Tenants can type the code with spaces or in lower case. */
export const formatJoinCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

// Tenants -----------------------------------------------------------------------

type MyPropertyRow = { property_id: string; name: string; postcode: string; manager_name: string; auto_approve_urgent: boolean };

const toMyProperty = (r: MyPropertyRow): MyProperty => ({
  id: r.property_id,
  name: r.name,
  postcode: r.postcode,
  managerName: r.manager_name,
  autoApproveUrgent: r.auto_approve_urgent,
});

/** The home the signed-in tenant has joined, or null. Demo mode: none. */
export async function loadMyProperty(): Promise<MyProperty | null> {
  if (!isSupabaseConfigured) return null;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null; // guests haven't joined anywhere
  const { data, error } = await supabase.rpc('my_property');
  if (error) throw error;
  const row = (data as MyPropertyRow[] | null)?.[0];
  return row ? toMyProperty(row) : null;
}

export async function joinProperty(code: string): Promise<MyProperty> {
  const { data, error } = await supabase.rpc('join_property', { p_code: code });
  if (error) throw new Error(sentence(error.message));
  return toMyProperty((data as MyPropertyRow[])[0]);
}

export async function leaveProperty(): Promise<void> {
  const { error } = await supabase.rpc('leave_property');
  if (error) throw error;
}

// Managers ----------------------------------------------------------------------

type PropertyRow = {
  property_id: string;
  name: string;
  postcode: string;
  join_code: string;
  auto_approve_urgent: boolean;
  tenants: string[];
  pending: number;
  open_jobs: number;
  jobs: number;
  spend_pence: number;
  spend_year_pence: number;
  last_job_at: string | null;
};

export async function loadManagedProperties(): Promise<ManagedProperty[]> {
  const { data, error } = await supabase.rpc('manager_properties');
  if (error) throw error;
  return ((data ?? []) as PropertyRow[]).map((r) => ({
    id: r.property_id,
    name: r.name,
    postcode: r.postcode,
    joinCode: r.join_code,
    autoApproveUrgent: r.auto_approve_urgent,
    tenants: r.tenants ?? [],
    pending: Number(r.pending),
    openJobs: Number(r.open_jobs),
    jobs: Number(r.jobs),
    spendPence: Number(r.spend_pence),
    spendYearPence: Number(r.spend_year_pence),
    lastJobAt: r.last_job_at,
  }));
}

type ManagedJobRow = {
  job_id: string;
  property_id: string;
  property_name: string;
  tenant_name: string;
  booked_by_manager: boolean;
  job_type_id: string;
  urgency: Urgency;
  status: JobStatus;
  approval: Approval | null;
  description: string;
  created_at: string;
  scheduled_for: string | null;
  finished_at: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  final_price_pence: number | null;
  pro_name: string | null;
  decline_reason: string | null;
  files: JobFileRef[] | null;
};

export async function loadManagedJobs(propertyId?: string): Promise<ManagedJob[]> {
  const { data, error } = await supabase.rpc('manager_jobs', propertyId ? { p_property: propertyId } : {});
  if (error) throw error;
  return ((data ?? []) as ManagedJobRow[]).map((r) => ({
    jobId: r.job_id,
    propertyId: r.property_id,
    propertyName: r.property_name,
    tenantName: r.tenant_name,
    bookedByManager: r.booked_by_manager,
    jobTypeId: r.job_type_id,
    urgency: r.urgency,
    status: r.status,
    approval: r.approval,
    description: r.description,
    createdAt: r.created_at,
    scheduledFor: r.scheduled_for,
    finishedAt: r.finished_at,
    confirmedAt: r.confirmed_at,
    paidAt: r.paid_at,
    finalPricePence: r.final_price_pence,
    proName: r.pro_name,
    declineReason: r.decline_reason,
    files: r.files ?? [],
  }));
}

type QuoteRequestRow = {
  request_id: string;
  property_id: string;
  property_name: string;
  tenant_name: string;
  requested_by_manager: boolean;
  description: string;
  status: ManagedQuoteRequest['status'];
  created_at: string;
  quotes: number;
  lowest_pence: number | null;
};

/** Open quote requests across the manager's properties (or one), newest first. */
export async function loadManagedQuoteRequests(propertyId?: string): Promise<ManagedQuoteRequest[]> {
  const { data, error } = await supabase.rpc('manager_quote_requests', propertyId ? { p_property: propertyId } : {});
  if (error) throw error;
  return ((data ?? []) as QuoteRequestRow[])
    .filter((r) => r.status === 'open')
    .map((r) => ({
      id: r.request_id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      tenantName: r.tenant_name,
      requestedByManager: r.requested_by_manager,
      description: r.description,
      status: r.status,
      createdAt: r.created_at,
      quotes: Number(r.quotes),
      lowestPence: r.lowest_pence,
    }));
}

export async function loadTenants(propertyId: string): Promise<Tenant[]> {
  const { data, error } = await supabase.rpc('manager_tenants', { p_property: propertyId });
  if (error) throw error;
  return ((data ?? []) as { tenant_id: string; name: string; joined_at: string }[]).map((r) => ({ id: r.tenant_id, name: r.name, joinedAt: r.joined_at }));
}

export async function addProperty(p: { name: string; postcode: string }): Promise<string> {
  const { data, error } = await supabase
    .from('properties')
    .insert({ name: p.name.trim(), postcode: p.postcode.trim().toUpperCase() })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateProperty(id: string, patch: { autoApproveUrgent?: boolean; archived?: boolean }): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .update({
      ...(patch.autoApproveUrgent === undefined ? {} : { auto_approve_urgent: patch.autoApproveUrgent }),
      ...(patch.archived ? { archived_at: new Date().toISOString() } : {}),
    })
    .eq('id', id);
  if (error) throw error;
}

/** The name tenants see on their requests, e.g. "Fulham Lettings". */
export async function loadCompanyName(): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const id = session.session?.user.id;
  if (!id) return '';
  const { data } = await supabase.from('profiles').select('company_name').eq('id', id).maybeSingle();
  return (data?.company_name as string | null) ?? '';
}

export async function saveCompanyName(name: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const id = session.session?.user.id;
  if (!id) throw new Error('Please sign in again');
  const { error } = await supabase.from('profiles').update({ company_name: name.trim() || null }).eq('id', id);
  if (error) throw error;
}

export async function removeTenant(propertyId: string, tenantId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_tenant', { p_property: propertyId, p_tenant: tenantId });
  if (error) throw error;
}

export async function approveJob(jobId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_job', { p_job: jobId });
  if (error) throw new Error(sentence(error.message));
}

export async function declineJob(jobId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('decline_job', { p_job: jobId, p_reason: reason });
  if (error) throw new Error(sentence(error.message));
}

/** Database messages start lower case; alerts read better as sentences. */
const sentence = (s: string) => (s ? `${s[0].toUpperCase()}${s.slice(1)}${/[.!?]$/.test(s) ? '' : '.'}` : s);

/** Sends the tenant code: the share sheet on phones, the clipboard on laptops. Resolves true once copied or shared. */
export async function shareJoinCode(p: { name: string; joinCode: string }, from: string): Promise<boolean> {
  const message =
    `${from || 'Your landlord'} uses Relay for repairs at ${p.name}. ` +
    `Get the Relay app or go to relay-trade.co.uk, open Account, then "Your landlord or agent", and enter the code ${formatJoinCode(p.joinCode)}. ` +
    `Report a repair there and it comes straight to us to approve.`;
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) {
      try {
        await nav.share({ text: message });
        return true;
      } catch {
        // Closed the share sheet, or not allowed: copy instead.
      }
    }
    if (nav?.clipboard) {
      await nav.clipboard.writeText(message);
      return true;
    }
    return false;
  }
  const result = await Share.share({ message });
  return result.action === Share.sharedAction;
}

// The example dashboard ----------------------------------------------------------
// Shown to visitors from the For landlords page, and in demo mode.

const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const EXAMPLE_COMPANY = 'Parsons Green Lettings';

export const EXAMPLE_PROPERTIES: ManagedProperty[] = [
  {
    id: 'example-1',
    name: 'Flat 2, 14 Lettice Street',
    postcode: 'SW6 4EH',
    joinCode: 'K7RM4P',
    autoApproveUrgent: true,
    tenants: ['Sophie Turner', 'Marcus Bell'],
    pending: 1,
    openJobs: 0,
    jobs: 5,
    spendPence: 61400,
    spendYearPence: 47500,
    lastJobAt: daysAgo(0, 9),
  },
  {
    id: 'example-2',
    name: '31 Munster Road',
    postcode: 'SW6 5RL',
    joinCode: 'T3QH8W',
    autoApproveUrgent: true,
    tenants: ['Olly Tran'],
    pending: 0,
    openJobs: 1,
    jobs: 3,
    spendPence: 38200,
    spendYearPence: 38200,
    lastJobAt: daysAgo(1, 18),
  },
  {
    id: 'example-3',
    name: 'Flat B, 8 Peterborough Road',
    postcode: 'SW6 3BN',
    joinCode: 'P9XD2C',
    autoApproveUrgent: false,
    tenants: ['Carmen Ruiz'],
    pending: 1,
    openJobs: 0,
    jobs: 2,
    spendPence: 14900,
    spendYearPence: 14900,
    lastJobAt: daysAgo(0, 8),
  },
  {
    id: 'example-4',
    name: '5 Bishops Park Road',
    postcode: 'SW6 6DZ',
    joinCode: 'H4NV6Y',
    autoApproveUrgent: true,
    tenants: [],
    pending: 0,
    openJobs: 0,
    jobs: 0,
    spendPence: 0,
    spendYearPence: 0,
    lastJobAt: null,
  },
];

const ex = (j: Partial<ManagedJob> & Pick<ManagedJob, 'jobId' | 'propertyId' | 'jobTypeId' | 'status' | 'createdAt'>): ManagedJob => {
  const p = EXAMPLE_PROPERTIES.find((x) => x.id === j.propertyId)!;
  return {
    propertyName: p.name,
    tenantName: p.tenants[0] ?? 'Tenant',
    bookedByManager: false,
    urgency: 'booked',
    approval: 'approved',
    description: '',
    scheduledFor: null,
    finishedAt: null,
    confirmedAt: null,
    paidAt: null,
    finalPricePence: null,
    proName: null,
    declineReason: null,
    files: [],
    ...j,
  };
};

const exampleFile = (kind: JobFileRef['kind'], n: number): JobFileRef => ({ path: `example-${kind}-${n}`, kind, type: kind === 'photo' ? 'image/jpeg' : 'application/pdf' });

export const EXAMPLE_JOBS: ManagedJob[] = [
  ex({
    jobId: 'example-j1',
    propertyId: 'example-1',
    jobTypeId: 'tap-repair',
    status: 'requested',
    approval: 'pending',
    createdAt: daysAgo(0, 9),
    scheduledFor: daysAgo(-2, 10),
    description: 'Kitchen mixer tap drips constantly, getting worse.',
  }),
  ex({
    jobId: 'example-j2',
    propertyId: 'example-3',
    jobTypeId: 'boiler-service',
    status: 'requested',
    approval: 'pending',
    createdAt: daysAgo(0, 8),
    scheduledFor: daysAgo(-3, 14),
    description: 'Annual service is due next month.',
  }),
  ex({
    jobId: 'example-j3',
    propertyId: 'example-2',
    jobTypeId: 'blocked-toilet',
    urgency: 'urgent',
    status: 'en_route',
    createdAt: daysAgo(1, 18),
    proName: 'Samuel A.',
    description: 'Downstairs toilet blocked and overflowing.',
  }),
  ex({
    jobId: 'example-j4',
    propertyId: 'example-1',
    jobTypeId: 'boiler-service-cp12',
    status: 'completed',
    createdAt: daysAgo(12),
    confirmedAt: daysAgo(10),
    paidAt: daysAgo(10),
    finalPricePence: 14900,
    proName: 'Karim B.',
    bookedByManager: true,
    files: [exampleFile('certificate', 1), exampleFile('photo', 1)],
  }),
  ex({
    jobId: 'example-j5',
    propertyId: 'example-2',
    jobTypeId: 'power-fault',
    urgency: 'urgent',
    status: 'completed',
    createdAt: daysAgo(21, 21),
    confirmedAt: daysAgo(21, 23),
    paidAt: daysAgo(21, 23),
    finalPricePence: 23700,
    proName: 'Tom H.',
  }),
  ex({
    jobId: 'example-j6',
    propertyId: 'example-1',
    jobTypeId: 'leak',
    urgency: 'urgent',
    status: 'completed',
    createdAt: daysAgo(34, 7),
    confirmedAt: daysAgo(34, 11),
    paidAt: daysAgo(34, 11),
    finalPricePence: 17500,
    proName: 'Samuel A.',
  }),
  ex({
    jobId: 'example-j7',
    propertyId: 'example-3',
    jobTypeId: 'cp12',
    status: 'completed',
    createdAt: daysAgo(48),
    confirmedAt: daysAgo(46),
    paidAt: daysAgo(46),
    finalPricePence: 9500,
    proName: 'Karim B.',
    bookedByManager: true,
    files: [exampleFile('certificate', 1)],
  }),
  ex({
    jobId: 'example-j8',
    propertyId: 'example-1',
    jobTypeId: 'socket-replace',
    status: 'cancelled',
    approval: 'declined',
    createdAt: daysAgo(55),
    declineReason: 'Our own electrician is already booked for this.',
  }),
  ex({
    jobId: 'example-j9',
    propertyId: 'example-2',
    jobTypeId: 'door-repair',
    status: 'completed',
    createdAt: daysAgo(70),
    confirmedAt: daysAgo(69),
    paidAt: daysAgo(69),
    finalPricePence: 14500,
    proName: 'Jake M.',
  }),
];

export const EXAMPLE_QUOTE_REQUESTS: ManagedQuoteRequest[] = [
  {
    id: 'example-q1',
    propertyId: 'example-2',
    propertyName: '31 Munster Road',
    tenantName: 'Olly Tran',
    requestedByManager: false,
    description: 'Move the bathroom radiator to the other wall and fit a heated towel rail where it was.',
    status: 'open',
    createdAt: daysAgo(1, 18),
    quotes: DEMO_QUOTES.length,
    lowestPence: Math.min(...DEMO_QUOTES.map((q) => q.pricePence)),
  },
];

// The example totals add up from the example history.
for (const p of EXAMPLE_PROPERTIES) {
  const done = EXAMPLE_JOBS.filter((j) => j.propertyId === p.id && j.status === 'completed');
  const year = new Date().getFullYear();
  p.spendPence = done.reduce((s, j) => s + (j.finalPricePence ?? 0), 0);
  p.spendYearPence = done.filter((j) => new Date(j.confirmedAt ?? j.createdAt).getFullYear() === year).reduce((s, j) => s + (j.finalPricePence ?? 0), 0);
  p.jobs = EXAMPLE_JOBS.filter((j) => j.propertyId === p.id && j.status !== 'cancelled').length;
}
