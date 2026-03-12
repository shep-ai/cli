'use client';

import { MessageSquare } from 'lucide-react';

export function ChatPageClient() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <MessageSquare className="text-muted-foreground h-12 w-12" />
      <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
      <p className="text-muted-foreground text-sm">GPT-style chat interface — coming soon.</p>
    </div>
  );
}
