import { useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '@/components/chat';

export default function ProChat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return <ChatScreen jobId={id} me="pro" otherName={name ?? 'Customer'} subtitle="Customer for this job" />;
}
