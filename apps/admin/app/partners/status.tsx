"use client";

import { StatusBadge } from "@/components/status-badge";

const PARTNER_TONES = {
  pending: "orange",
  approved: "green",
  rejected: "red",
} as const;

export const PartnerStatusBadge = ({ status }: { status: keyof typeof PARTNER_TONES }) => (
  <StatusBadge tone={PARTNER_TONES[status]} dot className="capitalize">
    {status}
  </StatusBadge>
);

const REFERRAL_TONES = {
  new: "gray",
  talking: "violet",
  won: "green",
  lost: "red",
} as const;

export const ReferralStatusBadge = ({ status }: { status: keyof typeof REFERRAL_TONES }) => (
  <StatusBadge tone={REFERRAL_TONES[status]} className="capitalize">
    {status}
  </StatusBadge>
);
