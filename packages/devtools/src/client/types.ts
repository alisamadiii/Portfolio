export interface ClientConfig {
  /** API base URL. Default: "https://www.alisamadii.com" */
  baseUrl?: string;
  /** Client site URL, sent as sourceUrl in requests */
  sourceUrl?: string;
}

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
  /** Pass from incoming request headers for CORS origin validation */
  origin?: string | null;
}

export interface ContactResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
  details?: string[];
}
