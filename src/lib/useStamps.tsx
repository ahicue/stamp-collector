"use client";

import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'stamp-collector-ids';

type StampsContextValue = {
  collectedIds: Set<string>;
  checkInStamp: (id: string) => void;
  isCollected: (id: string) => boolean;
  count: number;
  isInitialized: boolean;
};

const StampsContext = createContext<StampsContextValue | null>(null);

function readStoredIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return new Set();

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((v): v is string => typeof v === 'string'));
    }
  } catch (e) {
    console.error('Failed to parse stored stamps', e);
  }

  return new Set();
}

export function StampsProvider({ children }: { children: ReactNode }) {
  const [collectedIds, setCollectedIds] = useState<Set<string>>(readStoredIds);

  const checkInStamp = (id: string) => {
    setCollectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) return prev;
      next.add(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const isCollected = (id: string) => collectedIds.has(id);

  const value: StampsContextValue = {
    collectedIds,
    checkInStamp,
    isCollected,
    count: collectedIds.size,
    isInitialized: true,
  };

  return (
    <StampsContext.Provider value={value}>
      {children}
    </StampsContext.Provider>
  );
}

export function useStamps() {
  const context = useContext(StampsContext);
  if (!context) {
    throw new Error('useStamps must be used within a StampsProvider');
  }
  return context;
}

