import type { ReactElement } from "react";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

import { renderEmail, renderText } from "./utils";

let sesClient: SESClient | null = null;

function getSesClient() {
  if (!sesClient) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_VALUE;
    const secretAccessKey = process.env.AWS_SECRET_KEY_VALUE;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Missing AWS credentials in environment variables");
    }

    sesClient = new SESClient({
      region: process.env.AWS_BUCKET_ORIGIN || "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return sesClient;
}

type SendOptions = {
  from?: string;
  to: string | string[];
  subject: string;
  react: ReactElement;
};

async function send({ from, to, subject, react }: SendOptions) {
  const toAddresses = Array.isArray(to) ? to : [to];
  const source = from ?? "noreply@alisamadii.com";
  const htmlContent = await renderEmail(react);
  const textContent = await renderText(react);

  try {
    await getSesClient().send(
      new SendEmailCommand({
        Source: source,
        Destination: { ToAddresses: toAddresses },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: htmlContent, Charset: "UTF-8" },
            Text: { Data: textContent, Charset: "UTF-8" },
          },
        },
      })
    );
    return { data: true as const };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    console.error("[email] Send failed:", error);
    return { error: errorMessage };
  }
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
  const toAddresses = Array.isArray(to) ? to : [to];
  const source = from ?? "noreply@alisamadii.com";

  try {
    await getSesClient().send(
      new SendEmailCommand({
        Source: source,
        Destination: { ToAddresses: toAddresses },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: html, Charset: "UTF-8" } },
        },
      })
    );
    return { data: true as const };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    console.error("[email] Resend failed:", error);
    return { error: errorMessage };
  }
}

export const email = { send, resend };
