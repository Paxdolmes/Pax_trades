import { useSyncExternalStore } from 'react';

// Whether the tradesperson is taking jobs. Shared by the home and jobs tabs;
// set_availability in Supabase takes over once a backend is connected.

let online = false;
let onlineSince: number | null = null;
const listeners = new Set<() => void>();

export function setOnline(next: boolean) {
  online = next;
  onlineSince = next ? Date.now() : null;
  listeners.forEach((l) => l());
}

export function useOnline(): [boolean, number | null] {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => online,
  );
  return [value, onlineSince];
}
