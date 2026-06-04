import type { ContactInput, ContactResponse } from "./types";

export async function sendContact(
  baseUrl: string,
  token: string,
  sourceUrl: string | undefined,
  input: ContactInput
): Promise<ContactResponse> {
  const body: Record<string, unknown> = {
    token,
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
  };

  if (input.metadata) {
    body.metadata = input.metadata;
  }

  if (sourceUrl) {
    body.sourceUrl = sourceUrl;
  }

  const response = await fetch(`${baseUrl}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error || `Request failed with status ${response.status}`,
      details: data.details,
    };
  }

  return {
    success: true,
    id: data.id,
    message: data.message,
  };
}
