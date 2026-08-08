"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useConfig } from "@/contexts/config-context";

import { useDrafts } from "@/lib/store/drafts";

import { PublishDialog } from "@/components/publish/publish-dialog";

type PublishContextValue = {
  /** Number of local drafts for the current repo/branch. */
  draftCount: number;
  /** Opens the publish review dialog. */
  openPublishDialog: () => void;
};

const PublishContext = createContext<PublishContextValue | null>(null);

export function PublishProvider({ children }: { children: React.ReactNode }) {
  const { config } = useConfig();
  const [open, setOpen] = useState(false);

  // Drafts hydrate from localStorage (zustand persist) — gate the count until
  // mounted so the first client render matches the server-rendered HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const drafts = useDrafts(
    config?.owner ?? "",
    config?.repo ?? "",
    config?.branch ?? ""
  );
  const draftCount = mounted && config ? drafts.length : 0;

  const openPublishDialog = useCallback(() => setOpen(true), []);

  const value = useMemo(
    () => ({ draftCount, openPublishDialog }),
    [draftCount, openPublishDialog]
  );

  return (
    <PublishContext.Provider value={value}>
      {children}
      {config && <PublishDialog open={open} onOpenChange={setOpen} />}
    </PublishContext.Provider>
  );
}

export function usePublish() {
  const context = useContext(PublishContext);
  if (!context) {
    throw new Error("usePublish must be used within a PublishProvider");
  }
  return context;
}
