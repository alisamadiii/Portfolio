import type { ReactElement } from "react";
import { pretty, render, toPlainText } from "@react-email/render";

export const renderEmail = async (component: ReactElement) => {
  return await pretty(await render(component));
};

export const renderText = async (component: ReactElement) => {
  const rendered = await render(component);
  return toPlainText(rendered);
};
