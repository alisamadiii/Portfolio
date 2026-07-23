import type { AgencyClient } from "../client.js";
import type { Result } from "../error.js";
import type {
  SendContactRequest,
  SendEmailRequest,
  SendEmailResponse,
} from "../types.js";

export class EmailsResource {
  constructor(private readonly client: AgencyClient) {}

  /**
   * Send an email. Non-admin keys must send from their configured email
   * domain.
   */
  send(params: SendEmailRequest): Promise<Result<SendEmailResponse>> {
    return this.client.request("POST", "/v1/emails/send", { body: params });
  }

  /**
   * Submit a contact form. The API renders the notification email and
   * delivers it to your account email; the visitor's address becomes the
   * Reply-To. Rate limited to 1 request per 10 minutes per IP
   * (RATE_LIMIT_EXCEEDED, 429).
   */
  sendContact(params: SendContactRequest): Promise<Result<SendEmailResponse>> {
    return this.client.request("POST", "/v1/emails/contact", { body: params });
  }
}
