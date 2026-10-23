"use client";

import { BookingPage } from "@/components/agency/booking-page";
import { DocumentTitle } from "@/components/document-title";

export default function BookingTrackerPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Booking" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Booking</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-[14.5px]">
          Visitors book 15-minute appointments straight from your website.
          Every booking lands on your Google Calendar and shows up as a lead
          with where it came from.
        </p>
      </div>
      <BookingPage />
    </div>
  );
}
