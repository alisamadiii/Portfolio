"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { useAdminNavItems } from "@/hooks/use-admin-nav";
import { RepoCommandPalette } from "@/components/repo/repo-command-palette";

type CommandPaletteContextType = {
  openPalette: () => void;
};

const CommandPaletteContext = createContext<
  CommandPaletteContextType | undefined
>(undefined);

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider"
    );
  }
  return context;
};

/**
 * Hosts the ⌘K palette for the whole repo area (the palette registers its own
 * global hotkey; this just owns the open state and admin items).
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const adminItems = useAdminNavItems();

  const value = useMemo(() => ({ openPalette: () => setOpen(true) }), []);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <RepoCommandPalette
        open={open}
        onOpenChange={setOpen}
        adminItems={adminItems}
      />
    </CommandPaletteContext.Provider>
  );
}
