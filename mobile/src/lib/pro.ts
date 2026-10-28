// The signed-in tradesperson: name, trades, founding rate and documents, live or demo.

import * as Location from 'expo-location';
import { useEffect } from 'react';

import type { Trade } from '@/domain/catalog';
import { useAuth } from '@/lib/auth';
import { DEMO_PRO_CREDENTIALS, DEMO_TRADER } from '@/lib/demo';
import {
  firstName,
  isActiveJob,
  isLive,
  loadProAccount,
  loadProJobs,
  setAvailability,
  useLive,
  type ProAccount,
  type ProJob,
} from '@/lib/live';
import { setOnline } from '@/lib/pro-state';

export type ProView = ProAccount & { name: string; firstName: string };

const DEMO_ACCOUNT: ProAccount = {
  trades: DEMO_TRADER.trades as Trade[],
  founding: DEMO_TRADER.founding,
  approved: true,
  online: false,
  credentials: DEMO_PRO_CREDENTIALS.map((c, i) => ({ ...c, id: `demo-${i}`, reference: null })),
};

export function usePro(): ProView & { reload: () => Promise<void>; loading: boolean } {
  const { profile } = useAuth();
  const { data, reload, loading } = useLive(loadProAccount, DEMO_ACCOUNT);
  const name = profile?.fullName ?? DEMO_TRADER.name;
  // The database remembers whether they were online, e.g. after the app restarts.
  const savedOnline = data.online;
  useEffect(() => {
    if (isLive && !loading) setOnline(savedOnline);
  }, [savedOnline, loading]);
  return { ...data, name, firstName: firstName(name), reload, loading };
}

/** Goes on or offline. Live, it shares the pro's location so the dispatcher can find them. */
export async function goOnline(next: boolean): Promise<void> {
  if (isLive) {
    let point: { lng: number; lat: number } | null = null;
    if (next) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Relay Traders needs your location to send you jobs nearby.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      point = { lng: pos.coords.longitude, lat: pos.coords.latitude };
    }
    await setAvailability(next, point);
  }
  setOnline(next);
}

export type ProStats = { todayPence: number; todayJobs: number; weekPence: number };

const DEMO_STATS: ProStats = { todayPence: 41200, todayJobs: 4, weekPence: 182000 };

/** Today's and this week's take-home, from confirmed jobs. */
export function statsFor(jobs: ProJob[], now = new Date()): ProStats {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = now.getTime() - 7 * 86_400_000;
  let todayPence = 0;
  let todayJobs = 0;
  let weekPence = 0;
  for (const j of jobs) {
    if (!j.confirmedAt || j.payoutPence === null) continue;
    const at = Date.parse(j.confirmedAt);
    if (at >= startOfDay) {
      todayPence += j.payoutPence;
      todayJobs += 1;
    }
    if (at >= weekAgo) weekPence += j.payoutPence;
  }
  return { todayPence, todayJobs, weekPence };
}

/** The pro's jobs (live) and the stats from them; demo figures without a backend. */
export function useProJobs() {
  const { data, reload } = useLive(loadProJobs, [] as ProJob[]);
  return { jobs: data, stats: isLive ? statsFor(data) : DEMO_STATS, active: data.find(isActiveJob), reload };
}
