// The in-app list of notifications, the same ones sent as pushes.

import { supabase } from '@/lib/supabase';

export type AppNotification = { id: string; title: string; body: string; url: string | null; at: string; unread: boolean };

type Row = { id: string; title: string; body: string; url: string | null; created_at: string; read_at: string | null };

export async function loadNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, url, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({ id: r.id, title: r.title, body: r.body, url: r.url, at: r.created_at, unread: !r.read_at }));
}

export async function markNotificationsRead(): Promise<void> {
  await supabase.rpc('mark_notifications_read');
}
