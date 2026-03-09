'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseFeatureLogsResult {
  content: string;
  isConnected: boolean;
  error: string | null;
}

export function useFeatureLogs(featureId: string | null | undefined): UseFeatureLogsResult {
  const [content, setContent] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!featureId) {
      setContent('');
      setIsConnected(false);
      setError(null);
      return;
    }

    // Reset state for new featureId
    setContent('');
    setError(null);

    // Connect EventSource for live updates
    const es = new EventSource(`/api/feature-logs?featureId=${featureId}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.addEventListener('initial', (event: MessageEvent) => {
      const data: { content: string } = JSON.parse(event.data);
      setContent(data.content);
    });

    es.addEventListener('log', (event: MessageEvent) => {
      const data: { content: string } = JSON.parse(event.data);
      setContent((prev) => prev + data.content);
    });

    es.addEventListener('error', (event: MessageEvent) => {
      const data: { error: string } = JSON.parse(event.data);
      setError(data.error);
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [featureId, cleanup]);

  return { content, isConnected, error };
}
