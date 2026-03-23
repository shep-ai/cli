'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SessionSummary } from '@/components/common/feature-node/feature-sessions-dropdown';

const POLL_INTERVAL_MS = 30_000;
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ── Context shape ─────────────────────────────────────────────────────

interface SessionsContextValue {
  getSessionsForPath: (path: string) => SessionSummary[];
  hasActiveSessions: (path: string) => boolean;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

// ── Provider component ────────────────────────────────────────────────

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessionsByPath, setSessionsByPath] = useState<Map<string, SessionSummary[]>>(new Map());
  const sessionsByPathRef = useRef(sessionsByPath);
  sessionsByPathRef.current = sessionsByPath;

  const fetchSessions = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch('/api/sessions-batch');
      if (!res.ok) return;
      const data = (await res.json()) as { sessionsByPath: Record<string, SessionSummary[]> };
      const next = new Map<string, SessionSummary[]>();
      for (const [path, sessions] of Object.entries(data.sessionsByPath)) {
        next.set(path, sessions);
      }
      setSessionsByPath(next);
    } catch {
      // Silent — stale data is better than no data
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
    const timer = setInterval(() => void fetchSessions(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchSessions]);

  const getSessionsForPath = useCallback(
    (path: string): SessionSummary[] => sessionsByPathRef.current.get(path) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionsByPath]
  );

  const hasActiveSessions = useCallback(
    (path: string): boolean => {
      const sessions = sessionsByPathRef.current.get(path);
      if (!sessions) return false;
      const now = Date.now();
      return sessions.some(
        (s) => s.lastMessageAt && now - new Date(s.lastMessageAt).getTime() < ACTIVE_THRESHOLD_MS
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionsByPath]
  );

  const value = useMemo<SessionsContextValue>(
    () => ({ getSessionsForPath, hasActiveSessions }),
    [getSessionsForPath, hasActiveSessions]
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

// ── Consumer hook ─────────────────────────────────────────────────────

export function useSessionsContext(): SessionsContextValue {
  const ctx = useContext(SessionsContext);
  if (!ctx) {
    return { getSessionsForPath: () => [], hasActiveSessions: () => false };
  }
  return ctx;
}
