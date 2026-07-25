import { FileStack, FileText, FolderOpen } from "lucide-react";

import { Config } from "@/types/config";

export type NavigationNode = {
  type: "group" | "file" | "collection" | "media";
  name: string;
  label?: string;
  items?: NavigationNode[];
};

export type NavLeaf = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  breadcrumb: string[];
};

// Derive the content nav tree: prefer the pre-built `navigation.content`, fall
// back to mapping the raw `content` array into flat leaves.
export function getContentNavigation(config: Config | null): NavigationNode[] {
  if (!config?.object) return [];
  const navigation = (config.object as any).navigation?.content;
  if (Array.isArray(navigation)) return navigation;

  const content = (config.object as any).content ?? [];
  return content.map((item: any) => ({
    type: item.type,
    name: item.name,
    label: item.label || item.name,
  }));
}

export function getMediaNavigation(config: Config | null): NavigationNode[] {
  if (!config?.object) return [];
  const navigation = (config.object as any).navigation?.media;
  if (Array.isArray(navigation)) return navigation;

  const media = (config.object as any).media ?? [];
  return media.map((item: any) => ({
    type: "media" as const,
    name: item.name || "default",
    label: item.label || item.name || "Media",
  }));
}

export function getNodeHref(node: NavigationNode, config: Config | null): string {
  if (!config) return "#";
  const base = `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}`;
  if (node.type === "media") {
    return `${base}/media/${encodeURIComponent(node.name)}`;
  }
  return `${base}/${node.type}/${encodeURIComponent(node.name)}`;
}

export function getNodeIcon(node: NavigationNode): React.ReactNode {
  if (node.type === "collection") return <FileStack className="size-4" />;
  if (node.type === "media") return <FolderOpen className="size-4" />;
  return <FileText className="size-4" />;
}

// Count leaf (non-group) descendants of a node.
export function countLeaves(node: NavigationNode): number {
  if (node.type !== "group") return 1;
  return (node.items || []).reduce((sum, child) => sum + countLeaves(child), 0);
}

// Flatten a navigation tree into a searchable list of leaves, carrying the
// group labels above each leaf as a breadcrumb (e.g. ["Programs", "HerVoice"]).
export function flattenNavLeaves(
  nodes: NavigationNode[],
  config: Config | null,
  breadcrumb: string[] = []
): NavLeaf[] {
  const leaves: NavLeaf[] = [];

  nodes.forEach((node) => {
    const label = node.label || node.name;
    if (node.type === "group") {
      leaves.push(
        ...flattenNavLeaves(node.items || [], config, [...breadcrumb, label])
      );
      return;
    }

    const href = getNodeHref(node, config);
    leaves.push({
      key: href,
      label,
      href,
      icon: getNodeIcon(node),
      breadcrumb,
    });
  });

  return leaves;
}
