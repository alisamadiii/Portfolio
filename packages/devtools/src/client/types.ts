export interface ClientConfig {
  /** API base URL. Default: "https://api.alisamadii.com" */
  baseUrl?: string;
  /** Project API key for authentication */
  token: string;
  /** Client site URL, sent as sourceUrl in requests */
  sourceUrl?: string;
}

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ContactResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
  details?: string[];
}
