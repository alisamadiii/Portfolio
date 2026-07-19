import { email } from "@workspace/email/index";
import AgencyNotification from "@workspace/email/emails/agency-notification";

interface NotifyData {
  clientEmail?: string;
  projectType: string;
  subject: string;
  message: string;
  priority?: string;
}

/**
 * Fire-and-forget email notifier. No await, no try/catch at the call site.
 * Sends an email to agency@alisamadii.com silently in the background.
 */
export function notify(data: NotifyData) {
  email
    .send({
      from: "agency@alisamadii.com",
      to: "agency@alisamadii.com",
      subject: "New Portal Notification",
      react: AgencyNotification({
        clientEmail: data.clientEmail,
        projectType: data.projectType,
        subject: data.subject,
        message: data.message,
        priority: data.priority ?? "MEDIUM",
      }),
    })
    .catch(console.error);
}
