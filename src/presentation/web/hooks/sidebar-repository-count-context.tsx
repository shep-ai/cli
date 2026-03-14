'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

interface SidebarRepositoryCountContextValue {
  repositoryCount: number;
  setRepositoryCount: (count: number) => void;
}

const SidebarRepositoryCountContext = createContext<SidebarRepositoryCountContextValue | null>(
  null
);

interface SidebarRepositoryCountProviderProps {
  children: ReactNode;
}

export function SidebarRepositoryCountProvider({ children }: SidebarRepositoryCountProviderProps) {
  const [repositoryCount, setRepositoryCount] = useState(0);

  const value = useMemo<SidebarRepositoryCountContextValue>(
    () => ({ repositoryCount, setRepositoryCount }),
    [repositoryCount]
  );

  return (
    <SidebarRepositoryCountContext.Provider value={value}>
      {children}
    </SidebarRepositoryCountContext.Provider>
  );
}

export function useSidebarRepositoryCount(): SidebarRepositoryCountContextValue {
  const ctx = useContext(SidebarRepositoryCountContext);
  if (!ctx) {
    throw new Error(
      'useSidebarRepositoryCount must be used within a <SidebarRepositoryCountProvider>'
    );
  }
  return ctx;
}
