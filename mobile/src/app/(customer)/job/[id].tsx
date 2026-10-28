import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Body, Card, Screen, Title } from '@/components/ui';
import { STATUS_LABELS, type JobStatus } from '@/lib/jobs';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const STEPS: JobStatus[] = ['requested', 'accepted', 'en_route', 'on_site', 'completed'];

export default function JobStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<JobStatus>('requested');

  // Live status over Supabase realtime once a backend is connected.
  useEffect(() => {
    if (!isSupabaseConfigured || id.startsWith('demo-')) return;
    const channel = supabase
      .channel(`job-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${id}` },
        (payload) => setStatus((payload.new as { status: JobStatus }).status),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const current = STEPS.indexOf(status);

  return (
    <Screen>
      <Title>{STATUS_LABELS[status]}</Title>
      {id.startsWith('demo-') && (
        <Body secondary>Demo mode: connect Supabase to send this to real pros.</Body>
      )}
      {STEPS.map((step, i) => (
        <Card key={step} selected={i === current}>
          <Body secondary={i > current}>{STATUS_LABELS[step]}</Body>
        </Card>
      ))}
    </Screen>
  );
}
