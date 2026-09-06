// Thin client for the self-hosted useSend instance (mail.alisamadii.com).
// No SDK dependency — the API surface we use is small and stable.

const DEFAULT_URL = "https://mail.alisamadii.com";

export class UseSendError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string
  ) {
    super(message);
    this.name = "UseSendError";
  }
}

const getApiKey = () => {
  const apiKey = process.env.USESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing USESEND_API_KEY in environment variables");
  }
  return apiKey;
};

export const usesendUrl = () => process.env.USESEND_URL ?? DEFAULT_URL;

type FetchInit = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export async function usesendFetch<T>(
  path: string,
  { method = "GET", body, query }: FetchInit = {}
): Promise<T> {
  const url = new URL(path, usesendUrl());
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    // Error body is { error: { code, message } }, { error: "..." }, or a Zod
    // validation shape { error: { issues: [{ message, path }] } }.
    const parsed = (await res.json().catch(() => null)) as {
      error?:
        | {
            code?: string;
            message?: string;
            issues?: { message?: string; path?: (string | number)[] }[];
          }
        | string;
    } | null;
    const error = parsed?.error;
    let message = typeof error === "object" ? error?.message : error;
    if (!message && typeof error === "object" && error?.issues?.length) {
      message = error.issues
        .map((i) => [i.path?.join("."), i.message].filter(Boolean).join(": "))
        .join("; ");
    }
    const code = typeof error === "object" ? error?.code : undefined;
    throw new UseSendError(res.status, code, message ?? res.statusText);
  }

  return (await res.json()) as T;
}

export type SendEmailPayload = {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
};

export async function sendEmail(
  payload: SendEmailPayload
): Promise<{ emailId: string }> {
  return usesendFetch<{ emailId: string }>("/api/v1/emails", {
    method: "POST",
    body: payload,
  });
}
