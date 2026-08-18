/**
 * Scan + classify every page. Shared by `init` (which then codemods) and
 * `check` (which reports). Pure reads.
 */

import { parseAstro } from "./astro-doc.js";
import { classifyPage } from "./classify.js";
import { scanProject } from "./scan.js";
import type { PageAnalysis } from "../types.js";

export async function analyzeProject(root: string): Promise<{
  scan: ReturnType<typeof scanProject>;
  analyses: PageAnalysis[];
}> {
  const scan = scanProject(root);
  const analyses: PageAnalysis[] = [];
  for (const page of scan.pages) {
    const parsed = await parseAstro(page.source);
    analyses.push(classifyPage(page, parsed, page.source));
  }
  return { scan, analyses };
}
