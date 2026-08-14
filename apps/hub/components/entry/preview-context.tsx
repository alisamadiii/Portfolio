"use client";

import { createContext, useContext } from "react";

interface PreviewContextType {
  /** Focus a field by its react-hook-form dot-path (e.g. `hero.heading`). */
  focusField: (fieldName: string) => void;
}

const PreviewContext = createContext<PreviewContextType | null>(null);

/**
 * Read the preview controls. No-ops when no `PreviewProvider` is mounted, so
 * every field can call `focusField` unconditionally.
 */
export const usePreview = (): PreviewContextType => {
  return useContext(PreviewContext) ?? { focusField: () => {} };
};

export const PreviewProvider = ({
  focusField,
  children,
}: {
  focusField: (fieldName: string) => void;
  children: React.ReactNode;
}) => {
  return (
    <PreviewContext.Provider value={{ focusField }}>
      {children}
    </PreviewContext.Provider>
  );
};
