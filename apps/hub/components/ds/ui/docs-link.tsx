import type { ReactNode } from "react";

import { ArrowUpRight } from "@/components/icon";
import { docsUrl } from "@/lib/docs-links";

/** "Learn more ↗" to a Client Hub docs page on the agency site (new tab). */
export function DocsLink({ path, children = "Learn more" }: { path: string; children?: ReactNode }) {
  return (
    <a
      href={docsUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 whitespace-nowrap text-coral-text underline-offset-2 hover:underline"
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden />
    </a>
  );
}
