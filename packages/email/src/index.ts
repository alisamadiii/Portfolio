import type { ReactElement } from "react";
import { AgencyClient } from "@alisamadiillc/agency-api";

import { renderEmail, renderText } from "./utils";

let agencyClient: AgencyClient | null = null;

function getAgencyClient() {
  if (!agencyClient) {
    const apiKey =
      process.env.NEXT_PUBLIC_AGENCY_API_KEY ?? process.env.AGENCY_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_AGENCY_API_KEY in environment variables"
      );
    }

    agencyClient = new AgencyClient(apiKey);
  }
  return agencyClient;
}

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

  const { error } = await getAgencyClient().emails.send({
    from: source,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("[email] Send failed:", error);
    return { error: error.message };
  }
  return { data: true as const };
}

async function resend({
  from,
  to,
  subject,
  html,
}: {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}) {
  const source = from ?? "noreply@alisamadii.com";

  const { error } = await getAgencyClient().emails.send({
    from: source,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Resend failed:", error);
    return { error: error.message };
  }
  return { data: true as const };
}

export const email = { send, resend };
