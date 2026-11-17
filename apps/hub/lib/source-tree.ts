/** Code browser helpers: flat GitHub tree paths → nested folders, file → Shiki language. */

export type TreeEntry = { path: string; type: "blob" | "tree"; sha: string; size: number | null };

export type TreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  sha: string | null;
  children: TreeNode[];
};

const sortNodes = (nodes: TreeNode[]) => {
  nodes.sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.type === "folder" ? -1 : 1
  );
  for (const node of nodes) sortNodes(node.children);
  return nodes;
};

/** Nested tree, folders first then alphabetical. Missing parent folders are created. */
export function buildTree(entries: TreeEntry[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", sha: null, children: [] };
  const folders = new Map<string, TreeNode>([["", root]]);

  const folderFor = (path: string): TreeNode => {
    const existing = folders.get(path);
    if (existing) return existing;
    const slash = path.lastIndexOf("/");
    const parent = folderFor(slash === -1 ? "" : path.slice(0, slash));
    const node: TreeNode = { name: path.slice(slash + 1), path, type: "folder", sha: null, children: [] };
    parent.children.push(node);
    folders.set(path, node);
    return node;
  };

  for (const entry of entries) {
    if (entry.type === "tree") {
      folderFor(entry.path);
      continue;
    }
    const slash = entry.path.lastIndexOf("/");
    folderFor(slash === -1 ? "" : entry.path.slice(0, slash)).children.push({
      name: entry.path.slice(slash + 1),
      path: entry.path,
      type: "file",
      sha: entry.sha,
      children: [],
    });
  }
  return sortNodes(root.children);
}

const BY_EXT: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  astro: "astro",
  vue: "vue",
  svelte: "svelte",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "html",
  htm: "html",
  json: "json",
  jsonc: "jsonc",
  md: "markdown",
  mdx: "mdx",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  svg: "xml",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  py: "python",
  php: "php",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
};

const BY_NAME: Record<string, string> = {
  dockerfile: "docker",
  ".gitignore": "ini",
  ".npmrc": "ini",
  ".editorconfig": "ini",
  ".prettierrc": "json",
  makefile: "makefile",
};

/** Shiki language for a file path; "text" when unknown. */
export function langForPath(path: string): string {
  const name = (path.split("/").pop() ?? "").toLowerCase();
  if (BY_NAME[name]) return BY_NAME[name];
  if (name === ".env" || name.startsWith(".env.")) return "dotenv";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "text";
  return BY_EXT[name.slice(dot + 1)] ?? "text";
}

/** The file opened first: root README.md, else root package.json, else the first file. */
export function defaultFile(entries: TreeEntry[]): TreeEntry | null {
  const files = entries.filter((e) => e.type === "blob");
  return (
    files.find((e) => e.path.toLowerCase() === "readme.md") ??
    files.find((e) => e.path === "package.json") ??
    files[0] ??
    null
  );
}

/** Every parent folder of a path ("a/b/c.ts" → ["a", "a/b"]). */
export function parentFolders(path: string): string[] {
  const parts = path.split("/").slice(0, -1);
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}
