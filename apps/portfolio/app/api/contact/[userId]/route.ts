import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getIp, isRateLimited } from "@workspace/trpc/middleware/rate-limit";
import { db } from "@workspace/drizzle/index";
import { apiTokens, contactSubmissions } from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

// --- Validation ---

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email().max(320),
  subject: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sourceUrl: z.url().optional(),
});

// --- Handlers ---

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 1. Auth — validate token
    const apiKey = req.headers.get("x-api-key");

    console.log({ apiKey });

    if (!apiKey) {
      return NextResponse.json(
        { error: "Authentication failed. Please provide an API key." },
        { status: 401, headers: corsHeaders }
      );
    }

    const [tokenRecord] = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.token, apiKey))
      .limit(1);

    console.log(tokenRecord);

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Authentication failed. Invalid API key." },
        { status: 401, headers: corsHeaders }
      );
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "API key has expired. Please contact support." },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!tokenRecord.scopes.includes("contact")) {
      return NextResponse.json(
        { error: "API key does not have permission for this endpoint." },
        { status: 403, headers: corsHeaders }
      );
    }

    // Usage count incremented after successful email send (below)

    // 2. Parse body
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fields = err.issues.map((e) => {
          const field = e.path.join(".");
          return `${field}: ${e.message}`;
        });
        return NextResponse.json(
          {
            error:
              "Some fields are missing or invalid. Please check and try again.",
            details: fields,
          },
          { status: 400, headers: corsHeaders }
        );
      }
      console.log("[contact-api] body parse error:", err);
      return NextResponse.json(
        {
          error:
            "We couldn't read your message. Please make sure you're sending valid JSON.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Rate limit
    const ip = (await getIp()) || "unknown";

    if (isRateLimited(ip, 3)) {
      return NextResponse.json(
        {
          error:
            "You've sent too many messages. Please wait a minute before trying again.",
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // 4. Insert contact submission
    const toEmail = tokenRecord.clientEmail;
    const clientUserId = tokenRecord.clientUserId;

    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        userId: clientUserId ?? null,
        submitterName: body.name,
        submitterEmail: body.email,
        subject: body.subject,
        message: body.message,
        metadata: body.metadata ?? {},
        sourceUrl: body.sourceUrl,
      })
      .returning({ id: contactSubmissions.id });

    // 5. Send email to client
    const subMeta = body.metadata as Record<string, unknown> | undefined;

    const { error: emailError } = await sendEmail("contactMessage", toEmail, {
      name: body.name,
      email: body.email,
      phone: (subMeta?.phone as string) || undefined,
      message: body.message,
      metadata: subMeta,
    });

    if (emailError) {
      console.error("[contact-api] email failed:", emailError);
      return NextResponse.json(
        { error: "Failed to send email notification. Please try again later." },
        { status: 502, headers: corsHeaders }
      );
    }

    // Increment usage count
    db.update(apiTokens)
      .set({ usageCount: sql`${apiTokens.usageCount} + 1` })
      .where(eq(apiTokens.id, tokenRecord.id))
      .then(() => {});

    return NextResponse.json(
      {
        success: true,
        id: submission.id,
        message:
          "Your message has been sent successfully. We'll get back to you soon.",
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[contact-api]", err);
    return NextResponse.json(
      {
        error: "Something went wrong on our end. Please try again later.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
