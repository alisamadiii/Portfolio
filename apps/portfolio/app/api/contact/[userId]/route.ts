import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getIp, isRateLimited } from "@workspace/trpc/middleware/rate-limit";
import { db } from "@workspace/drizzle/index";
import { contactSubmissions, user } from "@workspace/drizzle/schema";
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
    // 1. Auth
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey || apiKey !== process.env.CLIENT_API_SECRET) {
      return NextResponse.json(
        {
          error:
            "Authentication failed. Please check your API key and try again.",
        },
        { status: 401, headers: corsHeaders }
      );
    }

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

    // 4. Verify user exists
    const { userId } = await params;
    const [client] = await db
      .select({
        id: user.id,
        email: user.email,
        metadata: user.metadata,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        {
          error:
            "We couldn't find the recipient for this message. Please contact support.",
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // 5. Insert
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        userId,
        submitterName: body.name,
        submitterEmail: body.email,
        subject: body.subject,
        message: body.message,
        metadata: body.metadata ?? {},
        sourceUrl: body.sourceUrl,
      })
      .returning({ id: contactSubmissions.id });

    // 6. Send email to client
    let meta: Record<string, unknown> | null = null;
    const rawMeta = client.metadata;
    if (rawMeta && typeof rawMeta === "object") {
      meta = rawMeta as Record<string, unknown>;
    } else if (typeof rawMeta === "string") {
      try {
        // Handle unquoted keys from DB (e.g. {contactEmail: "..."} → {"contactEmail": "..."})
        const fixed = rawMeta.replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":');
        meta = JSON.parse(fixed);
      } catch {
        meta = null;
      }
    }
    const toEmail = (meta?.contactEmail as string) || client.email;
    const siteName = (meta?.siteName as string) || undefined;
    const subMeta = body.metadata as Record<string, unknown> | undefined;

    console.log("[contact-api] rawMeta:", typeof rawMeta, rawMeta);
    console.log("[contact-api] parsed meta:", meta);
    console.log("[contact-api] sending to:", toEmail);

    sendEmail("contactMessage", toEmail, {
      name: body.name,
      email: body.email,
      phone: (subMeta?.phone as string) || undefined,
      message: body.message,
      siteName,
      metadata: subMeta,
    }).catch(() => {});

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
