import { after, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  agencyLead,
  type AgencyBookingSettings,
  type AgencyLeadUtm,
} from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email/usesend";
import {
  MAX_BODY_BYTES,
  isEmail,
  stripUrl,
  tooFast,
} from "@workspace/trpc/lib/agency/lead-capture";
import {
  BOOKING_MINUTES,
  MAX_RANGE_DAYS,
  isTimezone,
  isValidSlot,
  overlaps,
} from "@workspace/trpc/lib/agency/booking-slots";
import { getAvailability } from "@workspace/trpc/lib/agency/booking";
import { CHANNEL_LABELS, classifyLead } from "@workspace/trpc/lib/agency/lead-channel";
import { reportLeadStage } from "@workspace/trpc/lib/agency/conversion-uploads";
import {
  createBookingEvent,
  getBusy,
} from "@workspace/trpc/lib/integrations/calendar";
import { urls } from "@workspace/ui/lib/company";

import {
  attributionSchema,
  clientIp,
  corsHeaders,
  findClientByFormKey,
  hostOf,
  isAllowedOrigin,
  isRateLimited,
  leadEmailHtml,
} from "@/lib/agency-public";

// ─── Public booking endpoint ────────────────────────────────────
// Behind the booking widget (public/b.js) on agency clients' websites.
// GET serves the widget's config and free slots; POST books one: saves the
// visitor as an agency_lead (source "booking") and puts the meeting on the
// owner's Google Calendar with the visitor as attendee, so Google emails
// the invite and reminders to both sides.
//
// Like f.js, b.js posts JSON as text/plain (no preflight); GETs are plain
// cross-origin fetches. Origin is checked against the client's own domains.

const SLOT_MS = BOOKING_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(req.headers.get("origin"), "GET, POST, OPTIONS"),
  });
}

type PublicClient = NonNullable<Awaited<ReturnType<typeof findClientByFormKey>>>;

const activeTypes = (settings: AgencyBookingSettings) =>
  settings.types.filter((type) => type.active !== false);

/** Booking is open: settings saved with hours and at least one active type. */
const bookable = (settings: AgencyBookingSettings | null) =>
  Boolean(
    settings &&
      activeTypes(settings).length &&
      Object.values(settings.hours ?? {}).some((ranges) => ranges?.length)
  );

// ─── GET: config + availability ─────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formKey: string }> }
) {
  const { formKey } = await params;
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, "GET, POST, OPTIONS");

  const client = await findClientByFormKey(formKey);
  if (!client) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404, headers });
  }
  if (!isAllowedOrigin(origin, client)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }
  // Reads are cheap and the widget fetches per week browsed, so the cap is
  // far looser than the booking POST's.
  if (await isRateLimited(`bookget:${formKey}:${clientIp(req)}`, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers });
  }

  const settings = client.bookingSettings;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");

  // Bootstrap: what the widget renders before any dates.
  if (!from) {
    if (!bookable(settings)) {
      return NextResponse.json({ unavailable: true }, { headers });
    }
    return NextResponse.json(
      {
        // Shown in the widget's summary panel.
        site: hostOf(client.websiteUrl) ?? client.repo,
        types: activeTypes(settings!).map(({ id, name, description, meet }) => ({
          id,
          name,
          description,
          meet: Boolean(meet),
        })),
        minutes: BOOKING_MINUTES,
        noticeHours: settings!.noticeHours,
        horizonDays: settings!.horizonDays,
      },
      { headers }
    );
  }

  // Slots for a window.
  const fromMs = Date.parse(from);
  const toMs = Date.parse(url.searchParams.get("to") ?? "");
  if (
    !Number.isFinite(fromMs) ||
    !Number.isFinite(toMs) ||
    toMs <= fromMs ||
    toMs - fromMs > MAX_RANGE_DAYS * DAY_MS
  ) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400, headers });
  }
  if (!bookable(settings)) {
    return NextResponse.json({ slots: [], unavailable: true }, { headers });
  }

  try {
    const slots = await getAvailability({
      repoId: client.repoId,
      userId: client.userId,
      settings: settings!,
      fromMs,
      toMs,
    });
    return NextResponse.json({ slots }, { headers });
  } catch (error) {
    // Calendar disconnected or Google down: the widget shows "unavailable"
    // rather than offering slots we can't verify.
    console.error("Booking availability failed", error);
    return NextResponse.json({ slots: [], unavailable: true }, { headers });
  }
}

// ─── POST: book a slot ──────────────────────────────────────────

const bodySchema = attributionSchema.extend({
  typeId: z.string().min(1).max(40),
  at: z.string().max(40),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().max(254),
  phone: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
  timezone: z.string().max(60).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formKey: string }> }
) {
  const { formKey } = await params;
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, "GET, POST, OPTIONS");

  const client = await findClientByFormKey(formKey);
  if (!client) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404, headers });
  }
  if (!isAllowedOrigin(origin, client)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413, headers });
  }
  if (await isRateLimited(`booking:${formKey}:${clientIp(req)}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers }
    );
  }

  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413, headers });
  }
  const parsed = bodySchema.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })()
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const data = parsed.data;

  const settings = client.bookingSettings;
  const type = settings
    ? activeTypes(settings).find((t) => t.id === data.typeId)
    : undefined;
  if (!bookable(settings) || !type) {
    return NextResponse.json({ error: "Booking is unavailable." }, { status: 503, headers });
  }
  if (!isEmail(data.email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400, headers });
  }

  const atMs = Date.parse(data.at);
  if (!Number.isFinite(atMs) || atMs % SLOT_MS !== 0) {
    return NextResponse.json({ error: "Invalid time." }, { status: 400, headers });
  }
  const at = new Date(atMs);
  const end = new Date(atMs + SLOT_MS);
  if (!isValidSlot(at.toISOString(), settings!, new Date())) {
    return NextResponse.json(
      { error: "That time is not available." },
      { status: 400, headers }
    );
  }

  // Bots get a quiet success: no slot held, no event, no email.
  const isSpam = Boolean(data.hp) || tooFast(data.t);

  if (!isSpam) {
    // The owner's calendar may have filled this slot outside the widget.
    try {
      const busy = await getBusy(client.userId, at.toISOString(), end.toISOString());
      const taken = busy.some((b) =>
        overlaps(atMs, atMs + SLOT_MS, Date.parse(b.start), Date.parse(b.end))
      );
      if (taken) {
        return NextResponse.json(
          { error: "That time was just taken.", taken: true },
          { status: 409, headers }
        );
      }
    } catch (error) {
      console.error("Booking busy check failed", error);
      return NextResponse.json(
        { error: "Booking is unavailable." },
        { status: 503, headers }
      );
    }
  }

  const referrer = stripUrl(data.referrer);
  const utm: AgencyLeadUtm | null =
    data.utm && Object.values(data.utm).some(Boolean) ? data.utm : null;
  const channel = classifyLead({
    source: "booking",
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    utm,
    referrer,
    siteHost: hostOf(origin) ?? hostOf(client.websiteUrl),
  });
  const clickAt = data.clickAt ? new Date(data.clickAt) : null;
  const firstTouch =
    data.firstTouch && Object.values(data.firstTouch).some(Boolean)
      ? {
          referrer: stripUrl(data.firstTouch.referrer) ?? undefined,
          landing: stripUrl(data.firstTouch.landing) ?? undefined,
          at: data.firstTouch.at,
        }
      : null;
  const visitorTz =
    data.timezone && isTimezone(data.timezone) ? data.timezone : undefined;

  let lead;
  try {
    [lead] = await db
      .insert(agencyLead)
      .values({
        repoId: client.repoId,
        source: "booking",
        status: isSpam ? "spam" : "new",
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.notes || null,
        formName: type.name,
        // Spam rows don't hold the slot (the unique index skips null times).
        bookingAt: isSpam ? null : at,
        bookingEnd: isSpam ? null : end,
        booking: {
          typeId: type.id,
          typeName: type.name,
          ...(visitorTz ? { timezone: visitorTz } : {}),
        },
        pageUrl: stripUrl(data.pageUrl),
        referrer,
        utm,
        gclid: data.gclid || null,
        gbraid: data.gbraid || null,
        wbraid: data.wbraid || null,
        landingPage: stripUrl(data.landingPage),
        firstTouch,
        clickAt: clickAt && !Number.isNaN(clickAt.getTime()) ? clickAt : null,
        adClick:
          !data.gclid && !data.gbraid && !data.wbraid && /^\d+$/.test(utm?.id ?? "")
            ? { campaignId: utm!.id, campaignName: utm?.campaign }
            : null,
        channel,
      })
      .returning();
  } catch (error) {
    // Unique (repo_id, booking_at): someone booked the same slot first.
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: "That time was just taken.", taken: true },
        { status: 409, headers }
      );
    }
    throw error;
  }

  if (isSpam) {
    return NextResponse.json({ ok: true }, { headers });
  }

  // The calendar event invites the visitor; Google notifies both sides and
  // handles reminders. A failure here keeps the booking: the owner sees the
  // error on the lead and the slot stays held.
  let htmlLink: string | null = null;
  let meetUrl: string | null = null;
  let eventError: string | undefined;
  try {
    const event = await createBookingEvent({
      userId: client.userId,
      summary: `${type.name}: ${data.name}`,
      description: [
        data.notes && `Notes: ${data.notes}`,
        data.phone && `Phone: ${data.phone}`,
        `Email: ${data.email}`,
        `Booked on ${hostOf(client.websiteUrl) ?? "the website"}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      startISO: at.toISOString(),
      endISO: end.toISOString(),
      attendeeEmail: data.email,
      meet: Boolean(type.meet),
    });
    htmlLink = event.htmlLink;
    meetUrl = event.meetUrl;
    await db
      .update(agencyLead)
      .set({
        booking: {
          ...lead!.booking,
          eventId: event.id,
          htmlLink: event.htmlLink ?? undefined,
          meetUrl: event.meetUrl ?? undefined,
        },
      })
      .where(eq(agencyLead.id, lead!.id));
  } catch (error) {
    eventError = error instanceof Error ? error.message : "Calendar event failed.";
    console.error("Booking calendar event failed", error);
    await db
      .update(agencyLead)
      .set({ booking: { ...lead!.booking, eventError } })
      .where(eq(agencyLead.id, lead!.id));
  }

  // Report to Google Ads after responding (Book appointment action).
  after(() => reportLeadStage(client, lead!, "lead"));

  const siteName = hostOf(client.websiteUrl) ?? client.repo;
  const whenText = `${at.toISOString().slice(0, 10)} ${at.toISOString().slice(11, 16)} UTC`;
  const lines: [string, string][] = [
    ["Meeting", type.name],
    ["When", whenText],
    ["Name", data.name],
    ["Email", data.email],
    ...(data.phone ? [["Phone", data.phone] as [string, string]] : []),
    ...(data.notes ? [["Notes", data.notes] as [string, string]] : []),
    ["Source", CHANNEL_LABELS[channel]],
    ...(eventError
      ? [["Calendar", `Event creation failed: ${eventError}`] as [string, string]]
      : []),
  ];
  try {
    await sendEmail({
      from: "New Lead <noreply@alisamadii.com>",
      to: client.leadNotifyEmail ?? client.ownerEmail,
      replyTo: data.email,
      subject: `New booking: ${type.name} with ${data.name}`,
      html: leadEmailHtml(lines, `${urls.cms}/agency/${lead!.id}`, siteName, {
        tag: "New booking",
        title: `${data.name} booked ${type.name}`,
      }),
      text: [
        `New booking on ${siteName}`,
        "",
        ...lines.map(([label, value]) => `${label}: ${value}`),
        "",
        `${urls.cms}/agency/${lead!.id}`,
      ].join("\n"),
    });
  } catch (error) {
    // The booking is saved; a failed notification must not fail the visitor.
    console.error("Booking notification failed", error);
  }

  return NextResponse.json(
    { ok: true, at: at.toISOString(), htmlLink, meetUrl },
    { headers }
  );
}
