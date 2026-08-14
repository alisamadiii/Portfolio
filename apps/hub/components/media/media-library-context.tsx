"use client";

import { createContext, useContext } from "react";

interface MediaLibraryContextType {
  /** Provider mounted + hosted media + viewport wide enough for the split. */
  isAvailable: boolean;
  /** Id of the field currently driving the panel; `null` when closed. */
  activeFieldId: string | null;
  open: (request: {
    fieldId: string;
    onInsert: (urls: string[]) => void;
  }) => void;
  close: () => void;
}

const MediaLibraryContext = createContext<MediaLibraryContextType | null>(null);

/**
 * Read the media library panel controls. No-ops when no `MediaLibraryProvider`
 * is mounted (or hosted media is off), so fields can call unconditionally —
 * `isAvailable: false` routes them to the fullscreen modal fallback.
 */
export const useMediaLibrary = (): MediaLibraryContextType => {
  return (
    useContext(MediaLibraryContext) ?? {
      isAvailable: false,
      activeFieldId: null,
      open: () => {},
      close: () => {},
    }
  );
};

export { MediaLibraryContext };
export type { MediaLibraryContextType };
