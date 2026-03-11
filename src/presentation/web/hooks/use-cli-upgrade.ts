'use client';

import { useCallback, useRef, useState } from 'react';

export type UpgradeStatus = 'idle' | 'upgrading' | 'upgraded' | 'up-to-date' | 'error';

export interface CliUpgradeState {
  status: UpgradeStatus;
  output: string;
  errorMessage?: string;
}

export interface CliUpgradeActions {
  startUpgrade: () => void;
}

export function useCliUpgrade(): CliUpgradeState & CliUpgradeActions {
  const [status, setStatus] = useState<UpgradeStatus>('idle');
  const [output, setOutput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const startUpgrade = useCallback(() => {
    if (status === 'upgrading') return;

    setStatus('upgrading');
    setOutput('');
    setErrorMessage(undefined);

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
