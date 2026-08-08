import type { AgencyClient } from "../client.js";
import { AttachmentTooLargeError, type Result } from "../error.js";
import type {
  EmailAttachment,
  EmailAttachmentInput,
  EmailHtmlResponse,
  ListEmailsParams,
  ListEmailsResponse,
  SendContactRequest,
  SendEmailRequest,
  SendEmailResponse,
} from "../types.js";

/** Combined attachment size limit: 1 MB (1 MiB). */
const MAX_ATTACHMENTS_BYTES = 1_048_576;

// btoa/String.fromCharCode.apply over a whole large array overflows the call
// stack, so encode in chunks.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Decoded byte length of a base64 string, without allocating the bytes.
function base64ByteLength(b64: string): number {
  const len = b64.length;
  if (len === 0) return 0;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

// Coerce each attachment's content to base64, sum the decoded sizes, and throw
// AttachmentTooLargeError before any request is made if the total is too big.
function normalizeAttachments(
  attachments: EmailAttachmentInput[]
): EmailAttachment[] {
  let total = 0;
  const out = attachments.map((a) => {
    let content: string;
    if (typeof a.content === "string") {
      content = a.content;
      total += base64ByteLength(content);
    } else {
      const bytes =
        a.content instanceof Uint8Array
          ? a.content
          : new Uint8Array(a.content);
      total += bytes.byteLength;
      content = bytesToBase64(bytes);
    }
    return { filename: a.filename, content, contentType: a.contentType };
  });
  if (total >= MAX_ATTACHMENTS_BYTES) {
    throw new AttachmentTooLargeError(total, MAX_ATTACHMENTS_BYTES);
  }
  return out;
}

export class EmailsResource {
  constructor(private readonly client: AgencyClient) {}

  /**
   * Send an email. Non-admin keys must send from their configured email
   * domain. Pass `type` to categorize the log entry (defaults to "send").
   *
   * `attachments` are optional; their combined size must be under 1 MB or this
   * throws `AttachmentTooLargeError` synchronously (before any request).
   */
  send(params: SendEmailRequest): Promise<Result<SendEmailResponse>> {
    const body = params.attachments
      ? { ...params, attachments: normalizeAttachments(params.attachments) }
      : params;
    return this.client.request("POST", "/v1/emails/send", { body });
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
