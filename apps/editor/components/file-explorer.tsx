"use client";

import { useEffect, useState } from "react";
import { ChevronRight, File, Folder } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

/**
 * Build a tree from flat file paths (from WebContainer readdir).
 */
const buildTree = (paths: string[]): FileNode[] => {
  const root: FileNode[] = [];

  for (const path of paths) {
    const isDir = path.endsWith("/");
    const cleanPath = isDir ? path.slice(0, -1) : path;
    const parts = cleanPath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const partPath = parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;

      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = {
          name,
          path: partPath,
          type: isLast && !isDir ? "file" : "directory",
          children: isLast && !isDir ? undefined : [],
        };
        current.push(existing);
      }
      if (existing.children) {
        current = existing.children;
      }
    }
  }

  // Sort: directories first, then files, alphabetically
  const sortTree = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortTree(node.children);
    }
  };
  sortTree(root);

  return root;
};

export const FileExplorer = ({
  filePaths,
  selectedFile,
  onSelect,
}: {
  filePaths: string[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);

  useEffect(() => {
    setTree(buildTree(filePaths));
  }, [filePaths]);

  return (
    <div className="overflow-y-auto p-2">
      <p className="text-muted-foreground mb-2 px-1 text-xs font-medium uppercase">
        Files
      </p>
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

const TreeNode = ({
  node,
  depth,
  selectedFile,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (path: string) => void;
}) => {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="hover:bg-muted flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <ChevronRight
            className={cn(
              "size-3 shrink-0 transition-transform",
              expanded && "rotate-90"
            )}
          />
          <Folder className="size-3.5 shrink-0 text-blue-400" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded &&
          node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        "flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs",
        selectedFile === node.path
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted"
      )}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
    >
      <File className="size-3.5 shrink-0 text-zinc-400" />
      <span className="truncate">{node.name}</span>
    </button>
  );
};
