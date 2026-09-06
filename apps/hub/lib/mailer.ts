import { sendEmail as usesendSend } from "@workspace/email/usesend";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export const sendEmail = async ({ to, subject, html, text }: SendEmailInput) => {
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0)
    throw new Error("At least one recipient is required.");

  await usesendSend({
    from: "Ali Samadi CMS <no-reply@alisamadii.com>",
    to: recipients,
    subject,
    html,
    text,
  });
};
