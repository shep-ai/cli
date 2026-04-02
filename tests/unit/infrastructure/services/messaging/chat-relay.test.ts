/**
 * Messaging Chat Relay Unit Tests
 *
 * Tests for the bidirectional chat relay between messaging apps
 * and Shep interactive agent sessions, including output buffering.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessagingChatRelay } from '@/infrastructure/services/messaging/chat-relay.js';
import type { MessagingTunnelAdapter } from '@/infrastructure/services/messaging/messaging-tunnel.adapter.js';

describe('MessagingChatRelay', () => {
  let relay: MessagingChatRelay;
  let mockTunnelAdapter: { sendNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();

    mockTunnelAdapter = {
      sendNotification: vi.fn(),
    };

    relay = new MessagingChatRelay(
      mockTunnelAdapter as unknown as MessagingTunnelAdapter,
      100 // short buffer interval for testing
    );
  });

  afterEach(() => {
    relay.stop();
    vi.useRealTimers();
  });

  describe('startRelay', () => {
    it('should start a relay and return a confirmation message', () => {
      const result = relay.startRelay('feat-123', 'chat-456', 'telegram');
      expect(result).toContain('Chat relay started');
      expect(result).toContain('feat-123');
      expect(relay.hasActiveRelay()).toBe(true);
      expect(relay.getActiveFeatureId()).toBe('feat-123');
    });
  });

  describe('endRelay', () => {
    it('should end the relay and return a confirmation message', () => {
      relay.startRelay('feat-123', 'chat-456', 'telegram');
      const result = relay.endRelay();
      expect(result).toContain('Chat relay ended');
      expect(result).toContain('feat-123');
      expect(relay.hasActiveRelay()).toBe(false);
    });

    it('should return "no active relay" when there is none', () => {
      const result = relay.endRelay();
      expect(result).toContain('No active chat relay');
    });
  });

  describe('bufferAgentOutput', () => {
    it('should buffer output and flush after interval', () => {
      relay.startRelay('feat-123', 'chat-456', 'telegram');

      relay.bufferAgentOutput('Hello ');
      relay.bufferAgentOutput('world!');

      expect(mockTunnelAdapter.sendNotification).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(mockTunnelAdapter.sendNotification).toHaveBeenCalledTimes(1);
      expect(mockTunnelAdapter.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'chat.response',
          featureId: 'feat-123',
          message: 'Hello world!',
        })
      );
    });

    it('should not send when no active relay', () => {
      relay.bufferAgentOutput('test');
      vi.advanceTimersByTime(100);
      expect(mockTunnelAdapter.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('flushBuffer', () => {
    it('should flush immediately when called explicitly', () => {
      relay.startRelay('feat-123', 'chat-456', 'telegram');

      relay.bufferAgentOutput('immediate');
      relay.flushBuffer();

      expect(mockTunnelAdapter.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('should not send when buffer is empty', () => {
      relay.startRelay('feat-123', 'chat-456', 'telegram');
      relay.flushBuffer();
      expect(mockTunnelAdapter.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should flush any remaining buffer and clear the relay', () => {
      relay.startRelay('feat-123', 'chat-456', 'telegram');
      relay.bufferAgentOutput('final output');
      relay.stop();

      expect(mockTunnelAdapter.sendNotification).toHaveBeenCalledTimes(1);
      expect(relay.hasActiveRelay()).toBe(false);
    });
  });
});
