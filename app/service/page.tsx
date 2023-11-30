import React from "react";
import { type Metadata } from "next";
import ServiceLinks from "./ServiceLinks";
import ClientBadge from "./client-badge";

export const metadata: Metadata = {
  title: "Service",
};

export default function Service() {
  return (
    <>
      <h1 className="text_gradient text-2xl font-extrabold">hire me!</h1>
      <ClientBadge />
      <p className="mb-8 text-base text-muted">
        Welcome to our Website Building Service! I&apos;m your go-to developer
        for crafting awesome, custom websites that match your unique vibes and
        goals. Let&apos;s team up to create a standout online presence that
        feels just right for you!
      </p>
      <ServiceLinks />
    </>
  );
}
