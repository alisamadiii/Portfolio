import type { ReactElement } from "react";

import { sendEmail } from "./usesend";
import { renderEmail, renderText } from "./utils";

type SendOptions = {
  from?: string;
  to: string | string[];
  subject: string;
  react: ReactElement;
};

async function send({ from, to, subject, react }: SendOptions) {
  const source = from ?? "noreply@alisamadii.com";
  const html = await renderEmail(react);
  const text = await renderText(react);

  try {
    await sendEmail({ from: source, to, subject, html, text });
  } catch (error) {
    console.error("[email] Send failed:", error);
    return { error: error instanceof Error ? error.message : "Send failed" };
  }
  return { data: true as const };
}

export const email = { send };
