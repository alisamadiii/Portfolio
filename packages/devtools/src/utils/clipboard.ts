import type { FeedbackPayload } from "../types";

export function formatFeedbackMarkdown(payload: FeedbackPayload): string {
  const lines: string[] = [
    "## Client Feedback",
    "",
    `**Page**: ${payload.url}`,
    `**Path**: ${payload.path}`,
    `**Date**: ${payload.timestamp}`,
    "",
  ];

  if (payload.changes.length > 0) {
    lines.push("### Changes Requested", "");

    payload.changes.forEach((change, i) => {
      const num = i + 1;
      const typeLabel =
        change.type === "text" ? "Text Change" : "Image Change";
      lines.push(`${num}. **${typeLabel}** on \`${change.selector}\``);
      lines.push(`   - **Element**: \`${change.element}\``);
      lines.push(`   - **Current**: "${change.original}"`);
      lines.push(`   - **Change to**: "${change.modified}"`);
      if (change.note) {
        lines.push(`   - **Note**: "${change.note}"`);
      }
      lines.push("");
    });
  }

  return lines.join("\n");
}

export async function copyFeedbackToClipboard(
  payload: FeedbackPayload
): Promise<boolean> {
  const markdown = formatFeedbackMarkdown(payload);

  try {
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch {
    return false;
  }
}
