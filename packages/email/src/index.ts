// packages/email/index.ts
import { createElement } from "react";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

import AccountDeleted from "./emails/account-deleted";
import ReachOutToClients from "./emails/reach-out-to-clients";
import ResetPassword from "./emails/reset-password";
import VerifyEmail from "./emails/verify-email";
import { renderEmail, renderText } from "./utils";

type TemplateProps = {
  verifyEmail: { verificationCode: string };
  resetPassword: { resetPasswordLink: string };
  accountDeleted: { userName?: string; feedbackLink?: string };
  reachOutToClients: { email: string };
};

// Template registry — add new emails here, that's it
const templates: {
  [K in keyof TemplateProps]: {
    subject: string;
    fromLabel: string;
    component: React.ComponentType<TemplateProps[K]>;
  };
} = {
  verifyEmail: {
    subject: "Verify your email",
    fromLabel: "Verify your email",
    component: VerifyEmail,
  },
  resetPassword: {
    subject: "Reset your password",
    fromLabel: "Reset your password",
    component: ResetPassword,
  },
  accountDeleted: {
    subject: "Account deleted",
    fromLabel: "Account deleted",
    component: AccountDeleted,
  },
  reachOutToClients: {
    subject: "A quick note about your online presence",
    fromLabel: "Ali from AliSamadii.LLC",
    component: ReachOutToClients,
  },
};

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
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return sesClient;
}

const defaultFrom = `noreply@alisamadii.com`;

// One function to rule them all
export async function sendEmail<T extends keyof typeof templates>(
  template: T,
  to: string | string[],
  props: TemplateProps[T]
) {
  const { subject, fromLabel, component } = templates[template];
  const toAddresses = Array.isArray(to) ? to : [to];
  const element = createElement(component, props);
  const htmlContent = await renderEmail(element);
  const textContent = await renderText(element);

  try {
    await getSesClient().send(
      new SendEmailCommand({
        Source: `${fromLabel} <${template.toLowerCase() === "reachOutToClients" ? "agency@alisamadii.com" : defaultFrom}>`,
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
    return { data: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}
