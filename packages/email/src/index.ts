"use server";

import { createElement } from "react";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

import AccountDeleted from "./emails/account-deleted";
import ResetPassword from "./emails/reset-password";
import VerifyEmail from "./emails/verify-email";
import { renderEmail, renderText } from "./utils";

class EmailService {
  private sesClient: SESClient;
  private defaultFrom: string;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_BUCKET_ORIGIN || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_VALUE!,
        secretAccessKey: process.env.AWS_SECRET_KEY_VALUE!,
      },
    });
    this.defaultFrom = `team@${process.env.NEXT_PUBLIC_EMAIL_DOMAIN}`;
  }

  private async send({
    from,
    to,
    subject,
    component,
  }: {
    from: string;
    to: string | string[];
    subject: string;
    component: React.ReactElement;
  }) {
    const toAddresses = Array.isArray(to) ? to : [to];
    const htmlContent = await renderEmail(component);
    const textContent = await renderText(component);

    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: "UTF-8",
          },
          Text: {
            Data: textContent,
            Charset: "UTF-8",
          },
        },
      },
    });

    return await this.sesClient.send(command);
  }

  async sendVerifyEmail({ email, otp }: { email: string; otp: string }) {
    try {
      await this.send({
        from: `Verify your email <${this.defaultFrom}>`,
        to: email,
        subject: "Verify your email",
        component: createElement(VerifyEmail, { verificationCode: otp }),
      });
      return { data: true };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      };
    }
  }

  async sendResetPassword({
    email,
    resetPasswordLink,
  }: {
    email: string;
    resetPasswordLink: string;
  }) {
    try {
      await this.send({
        from: `Reset your password <${this.defaultFrom}>`,
        to: email,
        subject: "Reset your password",
        component: createElement(ResetPassword, { resetPasswordLink }),
      });
      return { data: true };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      };
    }
  }

  async sendAccountDeleted({
    email,
    userName,
    feedbackLink,
  }: {
    email: string;
    userName?: string;
    feedbackLink?: string;
  }) {
    try {
      await this.send({
        from: `Account deleted <${this.defaultFrom}>`,
        to: email,
        subject: "Account deleted",
        component: createElement(AccountDeleted, { userName, feedbackLink }),
      });
      return { data: true };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      };
    }
  }
}

// Create singleton instance (internal use only)
const emailService = new EmailService();

// Export individual functions for proper serialization with Next.js server actions
// Class instances can't be serialized when called from client components
// All exported functions must be async in "use server" files
export const sendVerifyEmail = async (params: { email: string; otp: string }) =>
  emailService.sendVerifyEmail(params);

export const sendResetPassword = async (params: {
  email: string;
  resetPasswordLink: string;
}) => emailService.sendResetPassword(params);

export const sendAccountDeleted = async (params: {
  email: string;
  userName?: string;
  feedbackLink?: string;
}) => emailService.sendAccountDeleted(params);
