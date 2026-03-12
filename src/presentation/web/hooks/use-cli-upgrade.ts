'use client';

import { useCallback, useRef, useState } from 'react';

export type UpgradeStatus =
  | 'idle'
  | 'upgrading'
  | 'restarting'
  | 'upgraded'
  | 'up-to-date'
  | 'error';

/** How often to poll the server during restart (ms). */
const RESTART_POLL_MS = 500;
/** Maximum time to wait for the server to come back after restart (ms). */
const RESTART_TIMEOUT_MS = 30_000;

export interface CliUpgradeState {
  status: UpgradeStatus;
  output: string;
  errorMessage?: string;
}

export interface CliUpgradeActions {
  startUpgrade: () => void;
}

/**
 * Poll the server until it responds, then reload the page.
 */
function waitForServerAndReload(timeoutMs: number, pollMs: number): void {
  const deadline = Date.now() + timeoutMs;

  const poll = () => {
    if (Date.now() > deadline) return;

    fetch('/api/version', { method: 'GET', cache: 'no-store' })
      .then((res) => {
        if (res.ok) {
          window.location.reload();
        } else {
          setTimeout(poll, pollMs);
        }
      })
      .catch(() => {
        setTimeout(poll, pollMs);
      });
  };

  // Brief initial delay to let the old server shut down
  setTimeout(poll, pollMs);
}

export function useCliUpgrade(): CliUpgradeState & CliUpgradeActions {
  const [status, setStatus] = useState<UpgradeStatus>('idle');
  const [output, setOutput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const restartingRef = useRef(false);

  const startUpgrade = useCallback(() => {
    if (status === 'upgrading' || status === 'restarting') return;

    setStatus('upgrading');
    setOutput('');
    setErrorMessage(undefined);
    restartingRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;

    fetch('/api/cli-upgrade', { method: 'POST', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          setStatus('error');
          setErrorMessage(`Server returned ${response.status}`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event: restarting')) {
              restartingRef.current = true;
              setStatus('restarting');
              waitForServerAndReload(RESTART_TIMEOUT_MS, RESTART_POLL_MS);
              continue;
            }
            if (line.startsWith('event: done')) {
              // Next data line contains the final result
              continue;
            }
            if (line.startsWith('data: ')) {
              const payload = line.slice(6);
              // Try to parse as final JSON result
              try {
                const result = JSON.parse(payload) as {
                  status: string;
                  errorMessage?: string;
                };
                if (result.status === 'upgraded') {
                  setStatus('upgraded');
                } else if (result.status === 'up-to-date') {
                  setStatus('up-to-date');
                } else if (result.status === 'error') {
                  setStatus('error');
                  setErrorMessage(result.errorMessage);
                }
              } catch {
                // Regular output line
                setOutput((prev) => prev + payload);
              }
            }
          }
        }
      })
      .catch((err: unknown) => {
        // If we're in restarting state, the connection dropping is expected
        if (restartingRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Upgrade failed');
      });

    return () => {
      controller.abort();
    };
  }, [status]);

  return { status, output, errorMessage, startUpgrade };
}
