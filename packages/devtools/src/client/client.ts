import { sendContact } from "./contact";
import type { ClientConfig, ContactInput, ContactResponse } from "./types";

const DEFAULT_BASE_URL = "https://www.alisamadii.com";

function detectSourceUrl(): string | undefined {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side: check common env vars
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return undefined;
}

export class AgencyClient {
  private baseUrl: string;
  private sourceUrl: string | undefined;

  constructor(config?: ClientConfig) {
    this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
    this.sourceUrl = config?.sourceUrl;
  }

  private getSourceUrl(): string | undefined {
    return this.sourceUrl ?? detectSourceUrl();
  }

  async contact(input: ContactInput): Promise<ContactResponse> {
    return sendContact(this.baseUrl, this.getSourceUrl(), input);
  }
}

export function createClient(config?: ClientConfig): AgencyClient {
  return new AgencyClient(config);
}
