import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getIp, isRateLimited } from "@workspace/trpc/middleware/rate-limit";
import { db } from "@workspace/drizzle/index";
import {
  clients,
  clientScopes,
  contactSubmissions,
  type ScopeMetadataMap,
} from "@workspace/drizzle/schema";
import { email } from "@workspace/email";
import ContactMessage from "@workspace/email/emails/contact-message";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

export async function POST(req: NextRequest) {
  try {
    // 1. Auth — validate origin domain
    const origin = req.headers.get("origin") || req.headers.get("referer");

    if (!origin) {
      return NextResponse.json(
        { error: "Could not determine request origin." },
        { status: 403, headers: corsHeaders }
      );
    }

    let hostname: string;
    try {
      hostname = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return NextResponse.json(
        { error: "Invalid origin header." },
        { status: 403, headers: corsHeaders }
      );
    }

    const [scopeRecord] = await db
      .select({
        scopeId: clientScopes.id,
        metadata: clientScopes.metadata,
        userId: clients.userId,
      })
      .from(clientScopes)
      .innerJoin(clients, eq(clientScopes.clientId, clients.id))
      .where(
        and(
          eq(clientScopes.type, "contact"),
          eq(clientScopes.isActive, true),
          sql`${clientScopes.metadata}->>'domain' = ${hostname}`
        )
      )
      .limit(1);

    if (!scopeRecord) {
      return NextResponse.json(
        { error: "This domain is not authorized to submit contact forms." },
        { status: 403, headers: corsHeaders }
      );
    }

    const meta = scopeRecord.metadata as ScopeMetadataMap["contact"];
    const toEmail = meta.email;
    const clientUserId = scopeRecord.userId;

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
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        userId: clientUserId,
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

    const { error: emailError } = await email.send({
      from: "agency@alisamadii.com",
      to: toEmail,
      subject: `${body.name} - AliSamadii LLC`,
      react: ContactMessage({
        name: body.name,
        email: body.email,
        phone: (subMeta?.phone as string) || undefined,
        message: body.message,
        metadata: subMeta,
      }),
    });

    if (emailError) {
      console.error("[contact-api] email failed:", emailError);
      return NextResponse.json(
        { error: "Failed to send email notification. Please try again later." },
        { status: 502, headers: corsHeaders }
      );
    }

    // Increment usage count
    db.update(clientScopes)
      .set({ usageCount: sql`${clientScopes.usageCount} + 1` })
      .where(eq(clientScopes.id, scopeRecord.scopeId))
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
        error:
          err instanceof Error
            ? err.message
            : "Something went wrong on our end. Please try again later.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
