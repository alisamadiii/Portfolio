import * as React from "react";

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

import {
  button,
  buttonSection,
  container,
  EmailFooter,
  EmailHeader,
  heading,
  hr,
  main,
  mutedText,
  subheading,
} from "./components/shared";

// Mirrors Delta/WeeklyReportData from @workspace/trpc (kept structural so the
// email package stays dependency-free).
type Delta = { pct: number | null; direction: "up" | "down" | "flat" };
type Compared = { current: number; previous: number };

export interface AgencyWeeklyReportProps {
  label?: string;
  currency?: string;
  leads?: Compared;
  won?: Compared;
  wonValueCents?: Compared;
  bookings?: Compared;
  spendCents?: Compared | null;
  costPerLeadCents?: { current: number | null; previous: number | null } | null;
  costPerBookingCents?:
    | { current: number | null; previous: number | null }
    | null;
  topCampaign?: { name: string; spendCents: number; leads: number } | null;
  topSearchTerm?: { term: string; costCents: number } | null;
  alerts?: string[];
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const money = (cents: number, currency: string) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

const deltaOf = (current: number, previous: number): Delta => {
  if (current === previous)
    return { pct: previous ? 0 : null, direction: "flat" };
  if (!previous)
    return { pct: null, direction: current > previous ? "up" : "down" };
  return {
    pct: Math.round(((current - previous) / previous) * 100),
    direction: current > previous ? "up" : "down",
  };
};

/** `goodWhen` flips the coloring: for cost per lead, down is the good news. */
function DeltaTag({
  current,
  previous,
  goodWhen = "up",
}: {
  current: number;
  previous: number;
  goodWhen?: "up" | "down";
}) {
  const change = deltaOf(current, previous);
  if (change.direction === "flat" && change.pct === null) return null;
  const arrow =
    change.direction === "up" ? "▲" : change.direction === "down" ? "▼" : "●";
  const good = change.direction === "flat" || change.direction === goodWhen;
  return (
    <span
      style={{
        color: good ? "#059669" : "#dc2626",
        fontSize: "13px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {arrow} {change.pct === null ? "new" : `${Math.abs(change.pct)}%`}
    </span>
  );
}

function StatRow({
  name,
  value,
  current,
  previous,
  goodWhen,
}: {
  name: string;
  value: string;
  current: number;
  previous: number;
  goodWhen?: "up" | "down";
}) {
  return (
    <Row style={{ padding: "7px 0" }}>
      <Column style={{ color: "#6b7280", fontSize: "14px" }}>{name}</Column>
      <Column align="right">
        <span style={{ fontSize: "15px", fontWeight: 700, marginRight: "10px" }}>
          {value}
        </span>
        <DeltaTag current={current} previous={previous} goodWhen={goodWhen} />
      </Column>
    </Row>
  );
}

export default function AgencyWeeklyReportEmail({
  label = "Oct 13 – Oct 19",
  currency = "USD",
  leads = { current: 0, previous: 0 },
  won = { current: 0, previous: 0 },
  wonValueCents = { current: 0, previous: 0 },
  bookings = { current: 0, previous: 0 },
  spendCents = null,
  costPerLeadCents = null,
  costPerBookingCents = null,
  topCampaign = null,
  topSearchTerm = null,
  alerts = [],
  dashboardUrl = "https://hub.alisamadii.com/marketing",
  unsubscribeUrl = "#",
}: AgencyWeeklyReportProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${leads.current} leads last week (${label})`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Your week in leads</Heading>
          <Text style={subheading}>{label}</Text>

          <Section
            style={{
              background: "#f9fafb",
              borderRadius: "12px",
              padding: "10px 18px",
              margin: "20px 0 0",
            }}
          >
            <StatRow
              name="New leads"
              value={String(leads.current)}
              {...leads}
            />
            {spendCents && (
              <StatRow
                name="Ad spend"
                value={money(spendCents.current, currency)}
                current={spendCents.current}
                previous={spendCents.previous}
                goodWhen="down"
              />
            )}
            {costPerLeadCents && costPerLeadCents.current !== null && (
              <StatRow
                name="Cost per ad lead"
                value={money(costPerLeadCents.current, currency)}
                current={costPerLeadCents.current}
                previous={costPerLeadCents.previous ?? 0}
                goodWhen="down"
              />
            )}
            {(bookings.current > 0 || bookings.previous > 0) && (
              <StatRow
                name="Bookings"
                value={String(bookings.current)}
                {...bookings}
              />
            )}
            {costPerBookingCents && costPerBookingCents.current !== null && (
              <StatRow
                name="Cost per booking"
                value={money(costPerBookingCents.current, currency)}
                current={costPerBookingCents.current}
                previous={costPerBookingCents.previous ?? 0}
                goodWhen="down"
              />
            )}
            <StatRow name="Deals won" value={String(won.current)} {...won} />
            {(wonValueCents.current > 0 || wonValueCents.previous > 0) && (
              <StatRow
                name="Revenue won"
                value={money(wonValueCents.current, currency)}
                {...wonValueCents}
              />
            )}
          </Section>

          {(topCampaign || topSearchTerm) && (
            <>
              <Hr style={hr} />
              {topCampaign && (
                <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
                  <span style={{ fontWeight: 700 }}>Top campaign:</span>{" "}
                  {topCampaign.name}: {money(topCampaign.spendCents, currency)}{" "}
                  spent, {topCampaign.leads}{" "}
                  {topCampaign.leads === 1 ? "lead" : "leads"}
                </Text>
              )}
              {topSearchTerm && (
                <Text style={{ margin: "0", fontSize: "14px", color: "#374151" }}>
                  <span style={{ fontWeight: 700 }}>Top search:</span>{" "}
                  &ldquo;{topSearchTerm.term}&rdquo;:{" "}
                  {money(topSearchTerm.costCents, currency)} spent
                </Text>
              )}
            </>
          )}

          {alerts.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700, color: "#b45309" }}>
                Needs attention
              </Text>
              {alerts.map((alert) => (
                <Text
                  key={alert}
                  style={{ margin: "0 0 4px", fontSize: "14px", color: "#374151" }}
                >
                  • {alert}
                </Text>
              ))}
            </>
          )}

          <Section style={buttonSection}>
            <Button href={dashboardUrl} style={button}>
              View full dashboard
            </Button>
          </Section>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>
            You get this every Monday.{" "}
            <Link href={unsubscribeUrl} style={{ color: "#9ca3af", textDecoration: "underline" }}>
              Unsubscribe
            </Link>
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}
