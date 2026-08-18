"use client";

import { createContext, useContext } from "react";

interface MediaLibraryContextType {
  /** Hosted media provider present (ImageKit) — the dialog can open. */
  isAvailable: boolean;
  /** Open the global media library dialog; `onInsert` gets the picked URLs. */
  open: (request: {
    onInsert: (urls: string[]) => void;
    maxSelected?: number;
    title?: string;
  }) => void;
  close: () => void;
}

const MediaLibraryContext = createContext<MediaLibraryContextType | null>(null);

/**
 * Controls for the single global media library dialog. No-ops when no
 * `MediaLibraryProvider` is mounted, so callers can invoke unconditionally.
 */
export const useMediaLibrary = (): MediaLibraryContextType => {
  return (
    useContext(MediaLibraryContext) ?? {
      isAvailable: false,
      open: () => {},
      close: () => {},
    }
  );
};

export { MediaLibraryContext };
export type { MediaLibraryContextType };
