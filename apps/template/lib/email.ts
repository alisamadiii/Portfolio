type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // Free-form kind ("contact", "receipt", …) — sent as a header for
  // traceability in the useSend dashboard.
  type?: string;
};

// Sends through the self-hosted useSend instance. Deliberately dependency-free
// (plain fetch) so this file copies out to client repos as-is. Handover: the
// client swaps USESEND_API_KEY in the environment (their own key or instance)
// — the X-Repo-Id / X-Email-Type headers travel with the send either way.
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
  type,
}: SendEmailInput) => {
  const apiKey = process.env.USESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing USESEND_API_KEY in environment variables");
  }
  const baseUrl = process.env.USESEND_URL ?? "https://mail.alisamadii.com";
  const repoId = process.env.REPO_ID;

  const res = await fetch(`${baseUrl}/api/v1/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "no-reply@alisamadii.com",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
      headers: {
        ...(repoId ? { "X-Repo-Id": repoId } : {}),
        "X-Email-Type": type ?? "send",
      },
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string } | string;
    } | null;
    const error = body?.error;
    const message =
      (typeof error === "object" ? error?.message : error) ??
      `useSend send failed (${res.status})`;
    throw new Error(message);
  }

  return (await res.json()) as { emailId: string };
};
