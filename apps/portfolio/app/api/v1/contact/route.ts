import { NextResponse } from "next/server";
import { z } from "zod";

import { email } from "@workspace/email";
import ContactMessage from "@workspace/email/emails/contact-message";

import {
  ApiError,
  corsHeaders,
  logSuccess,
  withClient,
} from "../_lib/with-client";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email().max(320),
  subject: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sourceUrl: z.url().optional(),
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export const POST = withClient(async ({ req, client, body, ip }) => {
  // Validate fields
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    throw new ApiError(`Validation failed: ${fields.join(", ")}`, 400);
  }

  const data = parsed.data;
  const toEmail = client.contactEmail ?? client.userEmail;
  const subMeta = data.metadata as Record<string, unknown> | undefined;
  const userAgent = req.headers.get("user-agent") ?? "Unknown";
  const referer = req.headers.get("referer") ?? undefined;

  // Send email
  const { error: emailError } = await email.send({
    from: "agency@alisamadii.com",
    to: toEmail,
    subject: `${data.name} - AliSamadii LLC`,
    react: ContactMessage({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      phone: (subMeta?.phone as string) || undefined,
      ipAddress: ip,
      userAgent,
      referer,
      submittedAt: new Date().toISOString(),
      pageUrl: data.sourceUrl ?? undefined,
      clientName: client.name,
    }),
  });

  if (emailError) {
    throw new ApiError(`Email failed: ${emailError}`, 502);
  }

  logSuccess(client, body);

  return NextResponse.json(
    {
      success: true,
      message:
        "Your message has been sent successfully. We'll get back to you soon.",
    },
    { status: 201, headers: corsHeaders }
  );
});
