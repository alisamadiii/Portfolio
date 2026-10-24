"use client";

import { BookingPage } from "@/components/agency/booking-page";
import { DocumentTitle } from "@/components/document-title";

export default function BookingTrackerPage() {
  return (
    <>
      <DocumentTitle title="Booking" />
      <BookingPage />
    </>
  );
}
