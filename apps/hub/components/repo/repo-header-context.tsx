"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

type RepoHeaderSlots = {
  header: ReactNode | null;
  /** Back-button target. `null` = default (the canvas). Strings keep it stable. */
  backHref: string | null;
  backLabel: string | null;
};

type RepoHeaderContextValue = {
  slots: RepoHeaderSlots;
  setSlots: (next: Partial<RepoHeaderSlots>) => void;
  clearSlots: () => void;
};

const RepoHeaderContext = createContext<RepoHeaderContextValue | null>(null);

const EMPTY: RepoHeaderSlots = { header: null, backHref: null, backLabel: null };

export function RepoHeaderProvider({ children }: { children: ReactNode }) {
  const [slots, setSlotsState] = useState<RepoHeaderSlots>(EMPTY);

  const setSlots = useCallback((next: Partial<RepoHeaderSlots>) => {
    setSlotsState((prev) => {
      const merged = { ...prev, ...next };
      if (
        prev.header === merged.header &&
        prev.backHref === merged.backHref &&
        prev.backLabel === merged.backLabel
      ) {
        return prev;
      }
      return merged;
    });
  }, []);

  const clearSlots = useCallback(() => {
    setSlotsState(EMPTY);
  }, []);

  const value = useMemo(
    () => ({
      slots,
      setSlots,
      clearSlots,
    }),
    [slots, setSlots, clearSlots]
  );

  return (
    <RepoHeaderContext.Provider value={value}>
      {children}
    </RepoHeaderContext.Provider>
  );
}

export function useRepoHeaderState() {
  const context = useContext(RepoHeaderContext);
  if (!context) {
    throw new Error(
      "useRepoHeaderState must be used within a RepoHeaderProvider"
    );
  }

  return context.slots;
}

export function useRepoHeader(slots: Partial<RepoHeaderSlots>) {
  const context = useContext(RepoHeaderContext);
  if (!context) {
    throw new Error("useRepoHeader must be used within a RepoHeaderProvider");
  }

  const { setSlots, clearSlots } = context;

  useEffect(() => {
    setSlots({
      header: slots.header ?? null,
      backHref: slots.backHref ?? null,
      backLabel: slots.backLabel ?? null,
    });
  }, [slots.header, slots.backHref, slots.backLabel, setSlots]);

  useEffect(() => {
    return () => {
      clearSlots();
    };
  }, [clearSlots]);
}

export function useOptionalRepoHeader(
  slots: Partial<RepoHeaderSlots>,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const context = useContext(RepoHeaderContext);
  const setSlots = context?.setSlots;
  const clearSlots = context?.clearSlots;

  useEffect(() => {
    if (!setSlots || !enabled) return;

    setSlots({
      header: slots.header ?? null,
      backHref: slots.backHref ?? null,
      backLabel: slots.backLabel ?? null,
    });
  }, [enabled, setSlots, slots.header, slots.backHref, slots.backLabel]);

  useEffect(() => {
    if (!clearSlots || !enabled) return;

    return () => {
      clearSlots();
    };
  }, [clearSlots, enabled]);
}
