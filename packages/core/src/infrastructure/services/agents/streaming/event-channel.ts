/**
 * EventChannel - Generic Async Push/Pull Queue
 *
 * Bridges event producers (push) and async iteration consumers (for-await-of).
 * Used by the streaming infrastructure to forward agent execution events
 * from the StreamingExecutorProxy to the AgentRunnerService caller.
 *
 * @example
 * ```typescript
 * const channel = new EventChannel<string>();
 *
 * // Producer side
 * channel.push('progress update');
 * channel.push('done');
 * channel.close();
 *
 * // Consumer side
 * for await (const event of channel) {
 *   console.log(event);
 * }
 * ```
 */
export class EventChannel<T> implements AsyncIterable<T> {
  private queue: T[] = [];
  private closed = false;
  private resolve: (() => void) | null = null;

  /**
   * Push an event into the channel.
   * Ignored if the channel is already closed.
   */
  push(event: T): void {
    if (this.closed) return;
    this.queue.push(event);
    if (this.resolve) {
      this.resolve();
      this.resolve = null;
    }
  }

  /**
   * Close the channel, signaling no more events will be pushed.
   * Safe to call multiple times.
   */
  close(): void {
    this.closed = true;
    if (this.resolve) {
      this.resolve();
      this.resolve = null;
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
        continue;
      }
      if (this.closed) return;
      await new Promise<void>((r) => {
        this.resolve = r;
      });
    }
  }
}
