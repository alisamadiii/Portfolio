"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Copy, File, FileCode, FileImage, Folder, FolderOpen } from "lucide-react";
import { codeToHtml } from "shiki";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { Button } from "@/components/ds/ui/button";
import { Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { handleCmsError } from "@/lib/trpc-errors";
import { buildTree, defaultFile, langForPath, parentFolders, type TreeEntry, type TreeNode } from "@/lib/source-tree";

/** Highlighting very large files freezes the tab; they render as plain text. */
const HIGHLIGHT_LIMIT = 300 * 1024;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|ico|svg)$/i;

/**
 * v0-style code browser over the project's backup repo: file tree on the
 * left, the selected file (syntax highlighted by type) on the right.
 */
export function CodeBrowser({
  projectId,
  actions,
  footer,
}: {
  projectId: string;
  /** Page actions (Download .zip, Change repo), shown in the code view's top bar. */
  actions?: ReactNode;
  /** Small note under the file tree (e.g. when the code was last updated). */
  footer?: ReactNode;
}) {
  const trpc = useTRPC();
  const tree = useQuery(trpc.project.sourceTree.queryOptions({ projectId }, { retry: false, staleTime: 60_000 }));
  const [selected, setSelected] = useState<TreeEntry | null>(null);
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState("");

  const entries = useMemo(() => tree.data?.entries ?? [], [tree.data]);
  const nodes = useMemo(() => buildTree(entries), [entries]);
  // Until the user picks a file, show README.md / package.json with its folders open.
  const initial = useMemo(() => defaultFile(entries), [entries]);
  const current = selected ?? initial;
  const open = expanded ?? new Set(initial ? parentFolders(initial.path) : []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? entries.filter((e) => e.type === "blob" && e.path.toLowerCase().includes(q)).slice(0, 200) : null;
  }, [entries, search]);

  const toggle = (path: string) => {
    const next = new Set(open);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  const pick = (entry: TreeEntry) => {
    setSelected(entry);
    setExpanded(new Set([...open, ...parentFolders(entry.path)]));
  };

  if (tree.isPending || tree.isError || !entries.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-surface">
        <TopBar actions={actions} />
        {tree.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 rounded-sm" style={{ width: `${25 + ((i * 37) % 50)}%` }} />
            ))}
          </div>
        ) : tree.isError ? (
          <EmptyState
            icon={<FileCode className="size-5" />}
            title="Couldn't load your code"
            text={handleCmsError(tree.error, "Try again in a moment, or download the .zip.")}
          />
        ) : (
          <EmptyState
            icon={<FileCode className="size-5" />}
            title="No files yet"
            text="Your code shows up here after your site's next update."
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface md:flex-row">
      <aside className="flex max-h-[40vh] shrink-0 flex-col border-b border-line md:max-h-none md:w-64 md:border-b-0 md:border-r">
        <div className="border-b border-line p-2">
          <Input placeholder="Search files" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto py-1.5">
          {matches ? (
            matches.length ? (
              matches.map((e) => (
                <button
                  key={e.path}
                  type="button"
                  onClick={() => pick(e)}
                  className={cn(
                    "flex w-full flex-col px-3 py-1.5 text-left hover:bg-canvas",
                    current?.path === e.path && "bg-canvas"
                  )}
                >
                  <span className="truncate text-[13px] text-ink">{e.path.split("/").pop()}</span>
                  <span className="truncate text-[12px] text-dim">{e.path}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-[13px] text-dim">No files match.</p>
            )
          ) : (
            nodes.map((node) => (
              <TreeRow
                key={node.path}
                node={node}
                depth={0}
                open={open}
                selected={current?.path ?? null}
                onToggle={toggle}
                onPick={(n) => pick({ path: n.path, type: "blob", sha: n.sha!, size: null })}
              />
            ))
          )}
        </div>
        {tree.data.truncated && (
          <p className="border-t border-line px-3 py-2 text-[12px] text-dim">
            Large repo, some files aren&apos;t listed. Download the .zip for everything.
          </p>
        )}
        {footer && <div className="hidden border-t border-line px-3 py-2 text-[12px] text-dim md:block">{footer}</div>}
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {current ? (
          <FileView projectId={projectId} file={current} actions={actions} />
        ) : (
          <>
            <TopBar actions={actions} />
            <EmptyState icon={<File className="size-5" />} title="Pick a file" text="Choose a file on the left to see its code." />
          </>
        )}
      </section>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  open,
  selected,
  onToggle,
  onPick,
}: {
  node: TreeNode;
  depth: number;
  open: Set<string>;
  selected: string | null;
  onToggle: (path: string) => void;
  onPick: (node: TreeNode) => void;
}) {
  const isOpen = open.has(node.path);
  const isFolder = node.type === "folder";
  const Icon = isFolder ? (isOpen ? FolderOpen : Folder) : IMAGE_EXT.test(node.name) ? FileImage : FileCode;
  return (
    <>
      <button
        type="button"
        onClick={() => (isFolder ? onToggle(node.path) : onPick(node))}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={cn(
          "flex w-full items-center gap-1.5 py-1 pr-3 text-left text-[13px] hover:bg-canvas",
          selected === node.path ? "bg-canvas text-ink" : "text-ink/80"
        )}
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-dim transition-transform", isOpen && "rotate-90", !isFolder && "invisible")}
        />
        <Icon className="size-3.5 shrink-0 text-dim" />
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder &&
        isOpen &&
        node.children.map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            open={open}
            selected={selected}
            onToggle={onToggle}
            onPick={onPick}
          />
        ))}
    </>
  );
}

/** The bar above the code: file path on the left, Copy + page actions on the right. */
function TopBar({ path, onCopy, actions }: { path?: string; onCopy?: () => void; actions?: ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
      <span className="min-w-0 truncate text-[13px] text-dim">
        {path?.split("/").map((part, i, all) => (
          <span key={i}>
            {i > 0 && <span className="px-1 text-faint">/</span>}
            <span className={i === all.length - 1 ? "text-ink" : undefined}>{part}</span>
          </span>
        ))}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {onCopy && (
          <Button size="sm" variant="ghost" icon={<Copy className="size-3.5" />} onClick={onCopy}>
            Copy
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}

function FileView({ projectId, file, actions }: { projectId: string; file: TreeEntry; actions?: ReactNode }) {
  const trpc = useTRPC();
  const content = useQuery(
    trpc.project.sourceFile.queryOptions(
      { projectId, sha: file.sha, path: file.path },
      { retry: false, staleTime: Infinity }
    )
  );
  const text = content.data?.kind === "text" ? content.data.content : null;

  const copy = () => {
    if (text == null) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Couldn't copy.")
    );
  };

  return (
    <>
      <TopBar path={file.path} onCopy={text != null ? copy : undefined} actions={actions} />
      <div className="min-h-0 flex-1 overflow-auto">
        {content.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 rounded-sm" style={{ width: `${40 + ((i * 37) % 55)}%` }} />
            ))}
          </div>
        ) : content.isError ? (
          <EmptyState
            icon={<File className="size-5" />}
            title="Couldn't open this file"
            text={handleCmsError(content.error, "Try again in a moment.")}
          />
        ) : content.data.kind === "text" ? (
          <CodeView code={content.data.content} path={file.path} sha={file.sha} />
        ) : content.data.kind === "image" ? (
          <div className="flex min-h-full items-center justify-center bg-canvas p-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the repo, not an optimizable asset */}
            <img src={content.data.dataUrl} alt={file.path} className="max-h-[70vh] max-w-full object-contain" />
          </div>
        ) : (
          <EmptyState
            icon={<File className="size-5" />}
            title={content.data.kind === "binary" ? "Can't preview this file" : "This file is too big to show"}
            text="It's in the .zip download with everything else."
          />
        )}
      </div>
    </>
  );
}

function CodeView({ code, path, sha }: { code: string; path: string; sha: string }) {
  const lang = langForPath(path);
  const html = useQuery({
    queryKey: ["shiki", sha, lang],
    queryFn: () => codeToHtml(code, { lang, theme: "github-light" }),
    enabled: code.length <= HIGHLIGHT_LIMIT,
    staleTime: Infinity,
    retry: false,
  });

  // Line numbers via a CSS counter on Shiki's `.line` spans (the plain fallback uses the same markup).
  return (
    <div className="font-mono text-[13px] leading-[1.6] [&_code]:[counter-reset:line] [&_pre]:!bg-transparent [&_pre]:px-0 [&_pre]:py-3 [&_.line]:before:mr-5 [&_.line]:before:inline-block [&_.line]:before:w-10 [&_.line]:before:text-right [&_.line]:before:text-faint [&_.line]:before:content-[counter(line)] [&_.line]:before:[counter-increment:line]">
      {html.data ? (
        // Shiki escapes the file contents; the HTML is its own token spans.
        <div dangerouslySetInnerHTML={{ __html: html.data }} />
      ) : (
        <pre>
          <code>
            {code.split("\n").map((line, i) => (
              <span key={i} className="line">
                {line}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      )}
    </div>
  );
}
