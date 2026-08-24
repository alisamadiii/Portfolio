/**
 * The signed-in dashboard: WordPress-plain two panes. Left nav from the
 * manifest (pages / globals / SEO / collections), right a generated form.
 * Save commits the whole file with the base sha; 409 → reload / overwrite.
 */

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { CmsManifest, CollectionDef } from "../core/types";
import {
  collectionListField,
  humanize,
  inferFields,
  setAtPath,
} from "../schema/form-schema";
import type { ApiClient, ContentResponse } from "./api";
import { Field } from "./fields";

const PAGES_PATH = "src/data/pages.json";
const VARIABLES_PATH = "src/data/variables.json";
const SEO_PATH = "src/data/seo.json";

type Selection =
  | { type: "page"; key: string }
  | { type: "variables" }
  | { type: "seo" }
  | { type: "collection"; name: string };

const selectionId = (selection: Selection): string =>
  selection.type === "page"
    ? `page:${selection.key}`
    : selection.type === "collection"
      ? `collection:${selection.name}`
      : selection.type;

export const Dashboard = ({
  api,
  siteName,
}: {
  api: ApiClient;
  siteName?: string;
}) => {
  const [selection, setSelection] = useState<Selection>({
    type: "page",
    key: "",
  });

  const manifestQuery = useQuery({
    queryKey: ["sa-manifest"],
    queryFn: () => api.getManifest(),
    staleTime: 5 * 60 * 1000,
    retry: (count, error: any) =>
      count < 2 && error?.status !== 401 && error?.status !== 403,
  });

  if (manifestQuery.isPending) {
    return <p className="sa-muted">Loading…</p>;
  }
  if (manifestQuery.isError) {
    return (
      <div className="sa-banner" data-tone="error">
        {(manifestQuery.error as Error).message}
      </div>
    );
  }

  const { manifest, branch } = manifestQuery.data;
  const pageKeys = Object.keys(manifest.pages ?? {});
  const arrayCollections = (manifest.collections ?? []).filter((collection) =>
    collection.path.endsWith(".json")
  );

  const active: Selection =
    selection.type === "page" && !selection.key && pageKeys[0]
      ? { type: "page", key: pageKeys[0] }
      : selection;

  return (
    <div className="sa-body">
      <nav className="sa-nav">
        <p className="sa-nav-heading">Pages</p>
        {pageKeys.map((key) => (
          <button
            key={key}
            type="button"
            className="sa-nav-item"
            data-active={
              active.type === "page" && active.key === key ? "true" : undefined
            }
            onClick={() => setSelection({ type: "page", key })}
          >
            {manifest.pages[key]?.title ?? humanize(key)}
          </button>
        ))}

        {arrayCollections.length > 0 && (
          <p className="sa-nav-heading">Collections</p>
        )}
        {arrayCollections.map((collection) => (
          <button
            key={collection.name}
            type="button"
            className="sa-nav-item"
            data-active={
              active.type === "collection" && active.name === collection.name
                ? "true"
                : undefined
            }
            onClick={() =>
              setSelection({ type: "collection", name: collection.name })
            }
          >
            {collection.label ?? humanize(collection.name)}
          </button>
        ))}

        <p className="sa-nav-heading">Site</p>
        <button
          type="button"
          className="sa-nav-item"
          data-active={active.type === "variables" ? "true" : undefined}
          onClick={() => setSelection({ type: "variables" })}
        >
          Global content
        </button>
        <button
          type="button"
          className="sa-nav-item"
          data-active={active.type === "seo" ? "true" : undefined}
          onClick={() => setSelection({ type: "seo" })}
        >
          SEO
        </button>
      </nav>

      <main className="sa-main">
        <FileEditor
          key={selectionId(active)}
          api={api}
          manifest={manifest}
          selection={active}
          branch={branch}
          siteName={siteName}
        />
      </main>
    </div>
  );
};

const editorTarget = (
  selection: Selection,
  manifest: CmsManifest
): { filePath: string; title: string; collection: CollectionDef | null } => {
  switch (selection.type) {
    case "page":
      return {
        filePath: PAGES_PATH,
        title:
          manifest.pages[selection.key]?.title ?? humanize(selection.key),
        collection: null,
      };
    case "variables":
      return { filePath: VARIABLES_PATH, title: "Global content", collection: null };
    case "seo":
      return { filePath: SEO_PATH, title: "SEO", collection: null };
    case "collection": {
      const collection =
        manifest.collections.find((c) => c.name === selection.name) ?? null;
      return {
        filePath: collection?.path ?? "",
        title: collection?.label ?? humanize(selection.name),
        collection,
      };
    }
  }
};

const FileEditor = ({
  api,
  manifest,
  selection,
  branch,
  siteName,
}: {
  api: ApiClient;
  manifest: CmsManifest;
  selection: Selection;
  branch: string;
  siteName?: string;
}) => {
  const queryClient = useQueryClient();
  const { filePath, title, collection } = editorTarget(selection, manifest);

  const [draft, setDraft] = useState<unknown>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);

  const contentQuery = useQuery({
    queryKey: ["sa-content", filePath],
    queryFn: () => api.getContent(filePath),
    enabled: Boolean(filePath),
  });

  const saveMutation = useMutation({
    mutationFn: (options: { force: boolean }) =>
      api.saveContent({
        path: filePath,
        sha: contentQuery.data?.sha ?? null,
        contentObject: draft,
        message: `content: update ${title.toLowerCase()}`,
        force: options.force,
      }),
    onSuccess: (result) => {
      if (result.status === "conflict") {
        setConflict(true);
        return;
      }
      // Re-anchor the query to what we just committed — no refetch needed.
      queryClient.setQueryData<ContentResponse>(["sa-content", filePath], {
        path: filePath,
        sha: result.sha ?? "",
        contentObject: draft,
      });
      setDraft(null);
      setConflict(false);
      setSaved(true);
    },
  });

  const content = draft ?? contentQuery.data?.contentObject;
  const dirty = draft !== null;

  const fields = useMemo(() => {
    if (content === undefined) return [];
    if (collection) return [collectionListField(collection)];
    if (selection.type === "page") {
      const slice = (content as Record<string, unknown>)?.[selection.key];
      if (!slice || typeof slice !== "object") return [];
      return inferFields(slice as Record<string, unknown>, selection.key);
    }
    return inferFields((content as Record<string, unknown>) ?? {});
  }, [content, collection, selection]);

  const onChange = (path: string, value: unknown) => {
    setDraft(setAtPath(content, path, value));
    setSaved(false);
  };

  const reload = () => {
    setDraft(null);
    setConflict(false);
    queryClient.invalidateQueries({ queryKey: ["sa-content", filePath] });
  };

  if (!filePath) return null;
  if (contentQuery.isPending) return <p className="sa-muted">Loading…</p>;
  if (contentQuery.isError) {
    return (
      <div className="sa-banner" data-tone="error">
        {(contentQuery.error as Error).message}
      </div>
    );
  }

  return (
    <>
      {conflict && (
        <div className="sa-banner" data-tone="warning">
          This content changed on GitHub since you loaded it.
          <div className="sa-banner-actions">
            <button type="button" className="sa-icon-btn" onClick={reload}>
              Discard my edits and reload
            </button>
            <button
              type="button"
              className="sa-icon-btn"
              onClick={() => saveMutation.mutate({ force: true })}
            >
              Save anyway (overwrite)
            </button>
          </div>
        </div>
      )}
      {saveMutation.isError && (
        <div className="sa-banner" data-tone="error">
          {(saveMutation.error as Error).message}
        </div>
      )}
      {saved && !dirty && (
        <div className="sa-banner" data-tone="success">
          Saved — {siteName ?? "the site"} is rebuilding on {branch}. Changes go
          live in a minute or two.
        </div>
      )}

      <div className="sa-panel">
        <h1 className="sa-panel-title">{title}</h1>
        {fields.length === 0 ? (
          <p className="sa-muted">Nothing editable here yet.</p>
        ) : (
          fields.map((field) => (
            <Field
              key={field.path || "root"}
              field={field}
              root={content}
              onChange={onChange}
            />
          ))
        )}
        <button
          type="button"
          className="sa-save"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate({ force: false })}
        >
          {saveMutation.isPending ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </div>
    </>
  );
};
