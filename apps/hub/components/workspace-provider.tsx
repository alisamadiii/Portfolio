"use client";

import { createContext, useContext } from "react";

// The (main) layout resolves the focused project on the server (cookie +
// listMine) and hands the id down here, so every client hook agrees with the
// server render. Switching projects goes through the selectProject action,
// which redirects and re-renders the layout with the new value.
const WorkspaceContext = createContext<string>("");

export function WorkspaceProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={projectId}>{children}</WorkspaceContext.Provider>;
}

/** The focused project's id (hub_project.id), or "" when the account has no projects. */
export const useProjectId = (): string => useContext(WorkspaceContext);
