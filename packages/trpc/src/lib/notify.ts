import { sendEmail } from "@workspace/email/index";

interface NotifyData {
  clientEmail?: string;
  projectType: string;
  subject: string;
  message: string;
  priority?: string;
  referenceId: string;
}

/**
 * Fire-and-forget email notifier. No await, no try/catch at the call site.
 * Sends an email to agency@alisamadii.com silently in the background.
 */
export function notify(data: NotifyData) {
  sendEmail("agencyNotification", "agency@alisamadii.com", {
    clientEmail: data.clientEmail,
    projectType: data.projectType,
    subject: data.subject,
    message: data.message,
    priority: data.priority ?? "MEDIUM",
    referenceId: data.referenceId,
  }).catch(console.error);
}
