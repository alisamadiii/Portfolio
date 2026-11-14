import type { ReactElement } from "react";
import { pretty, render, toPlainText } from "@react-email/render";

export const renderEmail = async (component: ReactElement) => {
  return await pretty(await render(component));
};

export const renderText = async (component: ReactElement) => {
  const rendered = await render(component);
  // table.details = label/value rows: keep them side by side in plain text.
  return toPlainText(rendered, {
    selectors: [{ selector: "table.details", format: "dataTable" }],
  });
};

/**
 * HTML + plain-text bodies for sendEmail, from one React Email template.
 * Not prettified: pretty() indents the markup, and white-space: pre-wrap
 * cells (multi-line messages) would show that indentation.
 */
export const renderEmailParts = async (component: ReactElement) => ({
  html: await render(component),
  text: await renderText(component),
});
