/** Shared CMS engine types (moved from apps/hub/types). */

import type { CollaboratorRole } from "@workspace/drizzle/schema";

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string | null;
  isAdmin?: boolean;
  accounts?: any[];
}

export interface Repo {
  id: number;
  owner: string;
  ownerId: number;
  repo: string;
  branches?: string[];
  defaultBranch?: string;
  isPrivate: boolean;
  /** The caller's collaborator role for this repo (admins = full-access). */
  myRole?: CollaboratorRole;
}
