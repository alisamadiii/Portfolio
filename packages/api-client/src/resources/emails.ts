import type { AgencyClient } from "../client.js";
import type { Result } from "../error.js";
import type {
  EmailHtmlResponse,
  ListEmailsParams,
  ListEmailsResponse,
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
   * Reply-To. Rate limited to 5 requests per 10 minutes per IP
   * (RATE_LIMIT_EXCEEDED, 429).
   */
  sendContact(params: SendContactRequest): Promise<Result<SendEmailResponse>> {
    return this.client.request("POST", "/v1/emails/contact", { body: params });
  }

  /**
   * Your own send history, newest first. Page by passing the createdAt of the
   * last row you received as `before`.
   */
  list(params: ListEmailsParams = {}): Promise<Result<ListEmailsResponse>> {
    return this.client.request("GET", "/v1/emails", {
      query: {
        limit: params.limit !== undefined ? String(params.limit) : undefined,
        before: params.before,
      },
    });
  }

  /**
   * Presigned URL for one archived email's HTML. The URL expires in ~60
   * seconds — fetch on demand, don't cache. Your own emails only (admins can
   * read any).
   */
  getHtml(id: string): Promise<Result<EmailHtmlResponse>> {
    return this.client.request("GET", `/v1/emails/${id}/html`);
  }
}
