import { notFound } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { ChatPageClient } from '@/components/features/chat/chat-page-client';

/** Skip static pre-rendering since we need runtime feature flag check. */
export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  if (!featureFlags.chat) notFound();

  return <ChatPageClient />;
}
