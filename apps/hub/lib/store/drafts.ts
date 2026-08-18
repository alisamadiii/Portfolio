"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Local drafts for content entries. Drafts live in localStorage only —
 * nothing hits GitHub until the user publishes. `values` holds exactly what
 * the files/[path] POST sends as `content` (list-unwrapped raw form values),
 * so the publish payload matches single-file save semantics.
 */

export type Draft = {
  v: 1;
  path: string;
  schemaName: string;
  /** File sha the draft was based on; null for new entries. Stale anchor. */
  sha: string | null;
  isNew: boolean;
  /**
   * The exact object sent as the publish `content`. Usually a keyed object
   * (page/site/entry); for an ARRAY collection it's the whole array file.
   */
  values: Record<string, unknown> | unknown[];
  savedAt: number;
  title?: string;
};

export const draftKey = (
  owner: string,
  repo: string,
  branch: string,
  path: string
) =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}/${branch}:${path}`;

const scopePrefix = (owner: string, repo: string, branch: string) =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}/${branch}:`;

type DraftsState = {
  drafts: Record<string, Draft>;
  setDraft: (key: string, draft: Draft) => void;
  deleteDraft: (key: string) => void;
  deleteMany: (keys: string[]) => void;
};

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (key, draft) =>
        set((state) => ({ drafts: { ...state.drafts, [key]: draft } })),
      deleteDraft: (key) =>
        set((state) => {
          const { [key]: _removed, ...rest } = state.drafts;
          return { drafts: rest };
        }),
      deleteMany: (keys) =>
        set((state) => {
          const rest = { ...state.drafts };
          for (const key of keys) delete rest[key];
          return { drafts: rest };
        }),
    }),
    {
      name: "cms:drafts:v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

export const getDraft = (
  owner: string,
  repo: string,
  branch: string,
  path: string
): Draft | undefined =>
  useDraftsStore.getState().drafts[draftKey(owner, repo, branch, path)];

export const listDraftEntries = (
  drafts: Record<string, Draft>,
  owner: string,
  repo: string,
  branch: string
): Array<[string, Draft]> => {
  const prefix = scopePrefix(owner, repo, branch);
  return Object.entries(drafts)
    .filter(([key]) => key.startsWith(prefix))
    .sort((a, b) => b[1].savedAt - a[1].savedAt);
};

/** Reactive list of drafts for the current repo/branch scope. */
export const useDrafts = (owner: string, repo: string, branch: string) => {
  const drafts = useDraftsStore((state) => state.drafts);
  return listDraftEntries(drafts, owner, repo, branch);
};

/**
 * Persist a draft, surfacing quota errors to the caller (localStorage is
 * ~5MB — zustand persist swallows write errors, so probe with a canary).
 */
export const saveDraftOrThrow = (key: string, draft: Draft) => {
  const state = useDraftsStore.getState();
  const serialized = JSON.stringify({
    state: { drafts: { ...state.drafts, [key]: draft } },
    version: 1,
  });
  try {
    localStorage.setItem("cms:drafts:v1", serialized);
  } catch (error) {
    throw new Error(
      "Draft storage is full on this device — publish or discard existing drafts."
    );
  }
  state.setDraft(key, draft);
};
