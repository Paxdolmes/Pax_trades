import { useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '@/components/chat';
import { DEMO_PRO } from '@/lib/demo';

export default function CustomerChat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return <ChatScreen jobId={id} me="customer" otherName={name ?? DEMO_PRO.name} subtitle="Your pro for this job" />;
}
