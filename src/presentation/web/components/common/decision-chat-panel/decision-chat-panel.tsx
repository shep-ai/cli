'use client';

import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSoundAction } from '@/hooks/use-sound-action';
import { useDecisionChat } from '@/hooks/use-decision-chat';
import { ChatMessageList } from '@/components/common/chat-message-list';
import type { ChatMessage } from '@/components/common/chat-message-bubble';
import type { DecisionChatPanelProps } from './decision-chat-panel-config';

export function DecisionChatPanel({
  featureId,
  reviewType,
  reviewContext,
  onApprove,
  onReject,
  approveLabel,
  approveIcon,
  isProcessing = false,
  isRejecting = false,
  children,
}: DecisionChatPanelProps) {
  const [chatInput, setChatInput] = useState('');
  const approveSound = useSoundAction('approve');
  const { messages, isStreaming, error, sendMessage } = useDecisionChat(reviewType, featureId);

  const disabled = isProcessing || isRejecting || isStreaming;

  // Map hook messages + error to ChatMessage[] for the list
  const displayMessages: ChatMessage[] = [
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    ...(error ? [{ role: 'system' as const, content: error }] : []),
  ];

  async function handleSend(e: { preventDefault: () => void }) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    // If onReject is not provided, treat Send as reject (backwards compat)
    if (!onReject) return;

    setChatInput('');
    await sendMessage(text, reviewContext);
  }

  function handleReject() {
    if (!onReject) return;
    const text = chatInput.trim();
    if (!text) return;
    onReject(text);
    setChatInput('');
  }

  return (
    <div className="border-border shrink-0 border-t">
      {displayMessages.length > 0 ? (
        <ChatMessageList messages={displayMessages} isStreaming={isStreaming} />
      ) : null}
      {children}
      {onReject ? (
        <div className="space-y-2 p-4">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Ask about these decisions..."
              aria-label="Chat about decisions"
              disabled={disabled}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="secondary"
              size="icon"
              aria-label="Send"
              disabled={disabled || !chatInput.trim()}
            >
              <Send />
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Reject"
              disabled={disabled || !chatInput.trim()}
              onClick={handleReject}
              className="flex-1"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={disabled}
              onClick={() => {
                approveSound.play();
                onApprove();
              }}
            >
              {approveIcon}
              {approveLabel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 pb-4">
          <Button
            type="button"
            className="flex-1"
            disabled={disabled}
            onClick={() => {
              approveSound.play();
              onApprove();
            }}
          >
            {approveIcon}
            {approveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
