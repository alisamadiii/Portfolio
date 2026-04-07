// packages/email/index.ts
import { createElement } from "react";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

import AccountDeleted from "./emails/account-deleted";
import AgencyNotification from "./emails/agency-notification";
import ClientMessage from "./emails/client-message";
import MagicLink from "./emails/magic-link";
import ReachOutToClients from "./emails/reach-out-to-clients";
import ResetPassword from "./emails/reset-password";
import VerifyEmail from "./emails/verify-email";
import { renderEmail, renderText } from "./utils";

type TemplateProps = {
  verifyEmail: { verificationCode: string };
  resetPassword: { resetPasswordLink: string };
  magicLink: { magicLinkUrl: string };
  accountDeleted: { userName?: string; feedbackLink?: string };
  reachOutToClients: { email: string };
  agencyNotification: {
    clientEmail?: string;
    projectType: string;
    subject: string;
    message: string;
    priority: string;
    referenceId: string;
  };
  clientMessage: {
    subject: string;
    message: string;
    clientEmail?: string;
    originalSubject?: string;
    originalMessage?: string;
    referenceId?: string;
  };
};

// Template registry — add new emails here, that's it
const templates: {
  [K in keyof TemplateProps]: {
    subject: string;
    fromLabel: string;
    from: string;
    component: React.ComponentType<TemplateProps[K]>;
  };
} = {
  verifyEmail: {
    subject: "Verify your email",
    fromLabel: "Verify your email",
    from: "noreply@alisamadii.com",
    component: VerifyEmail,
  },
  resetPassword: {
    subject: "Reset your password",
    fromLabel: "Reset your password",
    from: "noreply@alisamadii.com",
    component: ResetPassword,
  },
  magicLink: {
    subject: "Sign in to your account",
    fromLabel: "Sign in link",
    from: "noreply@alisamadii.com",
    component: MagicLink,
  },
  accountDeleted: {
    subject: "Account deleted",
    fromLabel: "Account deleted",
    from: "noreply@alisamadii.com",
    component: AccountDeleted,
  },
  reachOutToClients: {
    subject: "A quick note about your online presence",
    fromLabel: "Ali from AliSamadii.LLC",
    from: "agency@alisamadii.com",
    component: ReachOutToClients,
  },
  agencyNotification: {
    subject: "New Portal Notification",
    fromLabel: "AliSamadii.LLC Portal",
    from: "agency@alisamadii.com",
    component: AgencyNotification,
  },
  clientMessage: {
    subject: "A message from AliSamadii.LLC",
    fromLabel: "Ali from AliSamadii.LLC",
    from: "agency@alisamadii.com",
    component: ClientMessage,
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

// One function to rule them all
export async function sendEmail<T extends keyof typeof templates>(
  template: T,
  to: string | string[],
  props: TemplateProps[T]
) {
  const { subject, fromLabel, from, component } = templates[template];
  const toAddresses = Array.isArray(to) ? to : [to];
  const element = createElement(component, props);
  const htmlContent = await renderEmail(element);
  const textContent = await renderText(element);

  try {
    await getSesClient().send(
      new SendEmailCommand({
        Source: `${fromLabel} <${from}>`,
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
