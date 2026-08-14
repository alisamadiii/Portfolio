/** Shared CMS engine types (moved from apps/hub/types). */

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
}
